import React, { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
}

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorCount: 0,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error);
    console.error("[ErrorBoundary] Error info:", errorInfo);
    
    // Log to external service (e.g., Sentry) in production
    if (import.meta.env.PROD) {
      // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
    }
  }

  resetError = () => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      errorCount: prev.errorCount + 1,
    }));
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      // Default fallback UI
      return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
          <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg border border-red-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Oops! Something went wrong</h2>
            </div>

            <p className="text-sm text-slate-600 mb-4">
              The application encountered an unexpected error. Please try refreshing the page or contacting support if the problem persists.
            </p>

            {import.meta.env.DEV && (
              <div className="mb-4 p-3 bg-slate-100 rounded border border-slate-300 text-xs">
                <p className="font-mono text-red-600 font-semibold mb-2">Error Details:</p>
                <pre className="overflow-auto text-slate-700 whitespace-pre-wrap break-words">
                  {this.state.error.toString()}
                  {"\n\n"}
                  {this.state.error.stack}
                </pre>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.resetError}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700 transition"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.href = "/"}
                className="flex-1 px-4 py-2 bg-slate-200 text-slate-900 rounded font-medium hover:bg-slate-300 transition"
              >
                Home
              </button>
            </div>

            {this.state.errorCount > 0 && (
              <p className="text-xs text-slate-500 mt-3 text-center">
                (Error occurred {this.state.errorCount} time{this.state.errorCount !== 1 ? "s" : ""})
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
