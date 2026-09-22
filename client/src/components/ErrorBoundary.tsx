import { Component, ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled client error in ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#090A0C] text-zinc-100 flex items-center justify-center p-6 font-sans antialiased">
          <div className="max-w-xl w-full bg-[#0E1014] border border-rose-900/60 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
            {/* Background accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500" />

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 led-pulse-rose animate-ping" />
                  <span className="text-[10px] font-mono uppercase tracking-widest text-rose-400 font-bold">
                    Terminal System Interruption
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-100 tracking-tight">
                  Interface Error Detected
                </h1>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  An unexpected exception halted the client rendering engine. The operational state has been secured.
                </p>
              </div>
            </div>

            {/* Error Message Box */}
            <div className="p-3.5 bg-[#0A0C0F] border border-[#232730] rounded-xl font-mono text-xs text-rose-300 break-all space-y-2">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                Diagnostics Payload
              </div>
              <p className="font-semibold text-rose-300">
                {this.state.error?.message || 'Unknown runtime render exception'}
              </p>
              {this.state.errorInfo?.componentStack && (
                <details className="mt-2 text-[10px] text-zinc-500 cursor-pointer">
                  <summary className="hover:text-zinc-400">View component trace</summary>
                  <pre className="mt-2 p-2 bg-[#060709] rounded overflow-x-auto text-[9px] text-zinc-400 max-h-40 overflow-y-auto">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full sm:w-auto px-4 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-zinc-950 font-bold rounded-lg transition-all text-xs font-mono btn-tactile flex items-center justify-center gap-2 shadow-xs"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>RELOAD_WORKSPACE</span>
              </button>
              <button
                onClick={this.handleReset}
                className="w-full sm:w-auto px-4 py-2.5 bg-[#14171E] hover:bg-[#1B1F28] border border-[#272C38] text-zinc-200 font-semibold rounded-lg transition-all text-xs font-mono btn-tactile flex items-center justify-center gap-2"
              >
                <span>RETURN_TO_COMMAND</span>
                <span>&rarr;</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
