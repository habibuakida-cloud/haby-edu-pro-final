import React, { useState } from 'react';
import { CreditCard, Copy, CheckCircle2, AlertCircle } from 'lucide-react';
import { SubscriptionData } from '../../utils/SubscriptionService';

interface SubscriptionModalProps {
  subscription: SubscriptionData;
  onVerify: (ref: string) => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ subscription, onVerify }) => {
  const [ref, setRef] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <h2 className="text-xl font-black text-slate-900 mb-2">Usajili wa Shule</h2>
        
        {!subscription.isActive ? (
          <div className="bg-red-50 p-4 rounded-xl border border-red-200 mb-4">
            <p className="text-sm text-red-800 font-bold">Usajili wako umekwisha!</p>
          </div>
        ) : (
          <div className="mb-4">
            <p className="text-sm text-slate-600 mb-2">
              Shule yako iko kwenye trial au inahitaji kusajiliwa upya.
            </p>
          </div>
        )}

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
          <h3 className="font-bold text-sm mb-2">Lipa kupitia Tigo Pesa:</h3>
          <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-300">
            <span className="font-mono font-bold text-lg">0717616343</span>
            <button onClick={() => navigator.clipboard.writeText('0717616343')} className="text-blue-600 hover:text-blue-800">
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Laki moja (100,000) kwa mwaka au Elfu ishirini na tano (25,000) kwa mwezi.
          </p>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            placeholder="Weka Transaction ID (e.g., T12345678)"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            className="w-full p-3 border border-slate-300 rounded-xl"
          />
          <button
            onClick={() => onVerify(ref)}
            disabled={!ref}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl disabled:opacity-50"
          >
            Tuma Uthibitisho
          </button>
        </div>
      </div>
    </div>
  );
};
