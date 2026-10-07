import React, { useState } from 'react';
import { X, History, ArrowRight, UserCheck, Calendar, ArrowRightLeft, FileSpreadsheet } from 'lucide-react';
import { PromotionHistory, TransferHistory } from '../../types';

interface HistoryAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  promotionHistory: PromotionHistory[];
  transferHistory: TransferHistory[];
}

export const HistoryAuditModal: React.FC<HistoryAuditModalProps> = ({
  isOpen,
  onClose,
  promotionHistory,
  transferHistory
}) => {
  const [activeTab, setActiveTab] = useState<'promotion' | 'transfer'>('promotion');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#1f4d8b] text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <History className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight">Kumbukumbu za Kihistoria (Promotion & Transfer Ledger)</h2>
              <p className="text-xs text-blue-200">Rekodi zote za uhamisho wa madarasa na ukuzaji wa wanafunzi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-6 pt-4 bg-slate-50 border-b border-slate-200 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('promotion')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'promotion'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Ukuzaji wa Madarasa ({promotionHistory.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('transfer')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'transfer'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Uhamisho wa Madarasa/Mikondo ({transferHistory.length})</span>
          </button>
        </div>

        {/* Content table */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'promotion' ? (
            promotionHistory.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Hakuna rekodi za ukuzaji zilizohifadhiwa bado.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3">Mwanafunzi</th>
                      <th className="p-3">Kutoka Darasa</th>
                      <th className="p-3">Kwenda Darasa</th>
                      <th className="p-3">Mwaka / Kalenda</th>
                      <th className="p-3">Tarehe</th>
                      <th className="p-3">Aliyeidhinisha</th>
                      <th className="p-3">Hali</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {promotionHistory.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-bold text-slate-900">{log.studentName}</td>
                        <td className="p-3 text-slate-600">{log.fromClass}</td>
                        <td className="p-3 font-semibold text-blue-700 flex items-center gap-1">
                          <ArrowRight className="w-3 h-3 text-blue-500" />
                          <span>{log.toClass}</span>
                        </td>
                        <td className="p-3 text-slate-600 font-medium">
                          {log.academicYear} <span className="text-[10px] text-slate-400">({log.calendarType})</span>
                        </td>
                        <td className="p-3 text-slate-500 font-mono text-[11px]">
                          {new Date(log.promotedAt).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-slate-600">{log.promotedBy}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            log.status === 'GRADUATED'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            transferHistory.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Hakuna rekodi za uhamisho zilizohifadhiwa bado.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3">Mwanafunzi</th>
                      <th className="p-3">Kutoka</th>
                      <th className="p-3">Kwenda</th>
                      <th className="p-3">Sababu</th>
                      <th className="p-3">Tarehe</th>
                      <th className="p-3">Mhusika</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transferHistory.map(tr => (
                      <tr key={tr.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-bold text-slate-900">{tr.studentName}</td>
                        <td className="p-3 text-slate-600">{tr.fromClass}</td>
                        <td className="p-3 font-semibold text-blue-700 flex items-center gap-1">
                          <ArrowRight className="w-3 h-3 text-blue-500" />
                          <span>{tr.toClass}</span>
                        </td>
                        <td className="p-3 text-slate-700 italic max-w-xs truncate">{tr.reason}</td>
                        <td className="p-3 text-slate-500 font-mono text-[11px]">{tr.date}</td>
                        <td className="p-3 text-slate-600">{tr.transferredBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Funga / Close
          </button>
        </div>
      </div>
    </div>
  );
};
