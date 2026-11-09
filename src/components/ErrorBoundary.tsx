import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React Component Tree:', error, errorInfo);
    // If a dynamically imported module failed to fetch (e.g. after deployment or Vite restart), auto-reload once to fetch fresh assets
    if (
      error?.message?.includes('Failed to fetch dynamically imported module') ||
      error?.message?.includes('dynamically imported module') ||
      error?.message?.includes('Importing a module script failed')
    ) {
      const reloadKey = 'dynamic_import_reloaded_ts';
      const lastReload = sessionStorage.getItem(reloadKey);
      const now = Date.now();
      // Allow automatic reload once every 10 seconds if a module fetch fails
      if (!lastReload || now - Number(lastReload) > 10000) {
        sessionStorage.setItem(reloadKey, String(now));
        window.location.reload();
      }
    }
  }

  private handleReset = () => {
    try {
      sessionStorage.removeItem('dynamic_import_reloaded');
      sessionStorage.removeItem('dynamic_import_reloaded_ts');
      sessionStorage.removeItem('last_dynamic_import_fail');
    } catch (e) {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#080808] text-white flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="max-w-md w-full bg-[#141416] border border-[#252528] rounded-2xl p-8 space-y-6 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-[#FF3040]/10 border border-[#FF3040]/30 flex items-center justify-center mx-auto text-[#FF3040]">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-white tracking-tight">CINEMA NOVA</h1>
              <p className="text-zinc-400 text-sm">
                Сталася непередбачена помилка відображення. Натисніть кнопку нижче, щоб оновити додаток.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-black/60 rounded-lg text-left text-xs text-red-400 font-mono overflow-auto max-h-32 border border-red-900/30">
                {this.state.error.message}
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full py-3 bg-[#FF3040] hover:bg-[#FF4D5C] text-white font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-lg"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Оновити сторінку</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
