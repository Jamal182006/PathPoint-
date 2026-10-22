import React from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[PathPoint ErrorBoundary caught an unhandled error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
          <div className="ui-panel w-full max-w-lg p-8 text-center">
            <div className="w-14 h-14 bg-danger-50 text-danger-600 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-7 h-7" aria-hidden="true" />
            </div>

            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Something went wrong</h1>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              PathPoint encountered an unexpected error while loading this view. You can reload the page or return to the main dashboard.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="ui-btn ui-btn-primary w-full sm:w-auto"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                Reload page
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="ui-btn ui-btn-secondary w-full sm:w-auto"
              >
                <Home className="w-4 h-4" aria-hidden="true" />
                Return home
              </button>
            </div>

            {this.state.error && (
              <div className="mt-6 text-left border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={this.toggleDetails}
                  aria-expanded={this.state.showDetails}
                  className="w-full flex items-center justify-between text-xs font-semibold text-slate-500 hover:text-slate-700 py-1"
                >
                  <span>Diagnostic details</span>
                  {this.state.showDetails ? (
                    <ChevronUp className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>

                {this.state.showDetails && (
                  <div className="mt-3 p-3.5 bg-slate-900 text-slate-200 rounded-xl text-xs font-mono overflow-auto max-h-48 leading-relaxed">
                    <p className="text-danger-200 font-bold mb-1">
                      {this.state.error.name}: {this.state.error.message}
                    </p>
                    {this.state.error.stack && (
                      <pre className="whitespace-pre-wrap text-xs text-slate-400">
                        {this.state.error.stack}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
