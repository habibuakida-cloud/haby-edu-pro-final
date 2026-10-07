import React, { useState } from 'react';
import { X, ArrowRightLeft, AlertCircle, CheckCircle2, Calendar, User } from 'lucide-react';
import { Student, TransferHistory } from '../../types';
import { ALL_SCHOOL_CLASSES } from '../../constants/defaults';

interface StudentTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  onConfirmTransfer: (transfer: TransferHistory) => void;
  currentUserName?: string;
}

export const StudentTransferModal: React.FC<StudentTransferModalProps> = ({
  isOpen,
  onClose,
  student,
  onConfirmTransfer,
  currentUserName = 'Academic Office'
}) => {
  if (!isOpen || !student) return null;

  const [toClass, setToClass] = useState<string>(
    ALL_SCHOOL_CLASSES.find(c => c !== student.className) || 'Form 2'
  );
  const [toStream, setToStream] = useState<string>('STREAM A');
  const [reason, setReason] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Tafadhali eleza sababu ya uhamisho huu wa darasa.');
      return;
    }

    const targetClassWithStream = `${toClass} - ${toStream}`;
    const transferEntry: TransferHistory = {
      id: `trans_${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      fromClass: `${student.className}${student.stream ? ` - ${student.stream}` : ''}`,
      toClass: targetClassWithStream,
      reason: reason.trim(),
      date,
      transferredBy: currentUserName
    };

    onConfirmTransfer(transferEntry);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#1f4d8b] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <ArrowRightLeft className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">Hamisha Mwanafunzi / Transfer Student</h2>
              <p className="text-xs text-blue-200">Badili darasa na mkondo huku ukitunza kumbukumbu za awali</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Student Info Card */}
          <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl flex items-center gap-3">
            <User className="w-5 h-5 text-blue-700 shrink-0" />
            <div className="text-xs">
              <span className="font-black text-blue-950 block">{student.name}</span>
              <span className="text-blue-700 font-medium">Namba ya Usajili: {student.regNo}</span>
            </div>
          </div>

          {/* Current Class (Read-Only) */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
              Darasa la Sasa (Current Class - Readonly)
            </label>
            <input
              type="text"
              readOnly
              value={`${student.className} ${student.stream ? `(${student.stream})` : ''}`}
              className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 cursor-not-allowed outline-none"
            />
          </div>

          {/* Target Class Dropdown */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                Darasa Jipya (Transfer To)
              </label>
              <select
                value={toClass}
                onChange={(e) => setToClass(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
              >
                {ALL_SCHOOL_CLASSES.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                Mkondo (Stream)
              </label>
              <select
                value={toStream}
                onChange={(e) => setToStream(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
              >
                <option value="STREAM A">STREAM A</option>
                <option value="STREAM B">STREAM B</option>
                <option value="STREAM C">STREAM C</option>
              </select>
            </div>
          </div>

          {/* Effective Date */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
              Tarehe ya Uhamisho (Effective Date)
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
              Sababu ya Uhamisho (Reason for Transfer)
            </label>
            <textarea
              required
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Mfano: Mabadiliko ya mchepuo, ufaulu mzuri, au kusawazisha idadi ya wanafunzi..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 leading-relaxed">
            <strong>Kumbuka:</strong> Rekodi zote za mitihani zilizopita zitabaki bila kubadilika katika daftari la mitihani (Academic Ledger).
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl cursor-pointer"
            >
              Ghairi / Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Thibitisha Uhamisho</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
