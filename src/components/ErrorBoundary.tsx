import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
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
            <p className="text-xs text-slate-500 mb-5">
              Mfumo umepata hitilafu ndogo ya muda mfupi. Unaweza kufungua ukurasa wa mwanzo au kupakia upya.
            </p>

            {this.state.error?.message && (
              <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-left">
                <p className="text-[11px] font-bold text-rose-700">Maelezo ya hitilafu:</p>
                <p className="text-[10px] text-rose-600 font-mono break-all">{this.state.error.message}</p>
              </div>
            )}

            <div className="space-y-2">
              <button 
                onClick={() => {
                  try {
                    localStorage.removeItem('haby_active_view');
                    sessionStorage.removeItem('haby_active_view');
                  } catch (e) {}
                  this.setState({ hasError: false, error: null });
                  window.location.href = window.location.origin;
                }} 
                className="w-full py-3 bg-[#1f4d8b] hover:bg-[#163765] text-white rounded-xl font-bold text-sm shadow-md transition cursor-pointer"
              >
                Rudi Mwanzo (Dashboard)
              </button>

              <button 
                onClick={() => {
                  try {
                    sessionStorage.removeItem('haby_explicit_logout');
                  } catch (e) {}
                  window.location.reload();
                }} 
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition cursor-pointer"
              >
                Fungua Upya Ukurasa
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
