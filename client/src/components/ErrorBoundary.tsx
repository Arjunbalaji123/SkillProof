import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-white border border-[#E2E8F0] p-8 md:p-10 rounded-3xl max-w-lg w-full shadow-xl flex flex-col items-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center border border-red-200 shadow-sm">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h1 className="text-xl font-black text-[#0F172A] tracking-tight">Something went wrong</h1>
              <p className="text-xs text-[#64748B] leading-relaxed">
                An unexpected error occurred while rendering this page. The application caught the exception safely.
              </p>
            </div>

            {this.state.error && (
              <div className="w-full text-left p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-mono text-red-700 overflow-x-auto max-h-32">
                {this.state.error.message}
              </div>
            )}

            <div className="flex gap-3 pt-2 w-full justify-center">
              <button
                onClick={this.handleReload}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
              >
                <RefreshCw size={14} /> Reload Page
              </button>

              <button
                onClick={this.handleGoHome}
                className="px-4 py-2.5 rounded-xl border border-[#CBD5E1] bg-white hover:bg-slate-50 text-[#0F172A] font-bold text-xs flex items-center gap-1.5 transition"
              >
                <Home size={14} /> Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

