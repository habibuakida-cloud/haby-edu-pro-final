import React, { createContext, useContext, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDeleteContextType {
  openConfirmDelete: (title: string, message: string, onConfirm: () => void) => void;
}

const ConfirmDeleteContext = createContext<ConfirmDeleteContextType | undefined>(undefined);

export const ConfirmDeleteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modal, setModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);

  const openConfirmDelete = (title: string, message: string, onConfirm: () => void) => {
    setModal({ isOpen: true, title, message, onConfirm });
  };

  const close = () => setModal(null);

  return (
    <ConfirmDeleteContext.Provider value={{ openConfirmDelete }}>
      {children}
      {modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-8 h-8 shrink-0" />
              <h2 className="text-lg font-black tracking-tight">{modal.title}</h2>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">{modal.message}</p>
            <div className="flex justify-end gap-3 pt-4">
              <button 
                onClick={close} 
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={() => { modal.onConfirm(); close(); }} 
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmDeleteContext.Provider>
  );
};

export const useConfirmDelete = () => {
  const context = useContext(ConfirmDeleteContext);
  if (!context) throw new Error('useConfirmDelete must be used within ConfirmDeleteProvider');
  return context;
};
