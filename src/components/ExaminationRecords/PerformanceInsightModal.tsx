import React from 'react';
import { X, Sparkles } from 'lucide-react';

interface PerformanceInsightModalProps {
  isOpen: boolean;
  onClose: () => void;
  insight: string | null;
}

export const PerformanceInsightModal: React.FC<PerformanceInsightModalProps> = ({ isOpen, onClose, insight }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X /></button>
        <div className="flex items-center gap-2 text-purple-600 mb-4">
          <Sparkles />
          <h2 className="text-xl font-black">Performance Insight</h2>
        </div>
        <div className="text-sm text-slate-700 whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
          {insight || 'Analyzing...'}
        </div>
      </div>
    </div>
  );
};
