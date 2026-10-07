import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0f2948] p-6 text-white font-sans">
          <div className="text-center bg-white text-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full">
            <div className="w-12 h-12 bg-blue-100 text-[#1f4d8b] rounded-2xl flex items-center justify-center mx-auto mb-3 font-black text-xl">
              H
            </div>
            <h2 className="text-lg font-black text-slate-900 mb-1">HABY EDU PRO</h2>
            <p className="text-xs text-slate-500 mb-5">Mfumo unajiweka sawa. Bonyeza kitufe hapa chini kufungua upya.</p>
            <button 
              onClick={() => {
                try {
                  sessionStorage.removeItem('haby_explicit_logout');
                } catch (e) {}
                window.location.reload();
              }} 
              className="w-full py-3 bg-[#1f4d8b] hover:bg-[#163765] text-white rounded-xl font-bold text-sm shadow-md transition cursor-pointer"
            >
              Fungua Mfumo Upya
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
