import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex items-center justify-center bg-surface">
          <div className="glass-panel-solid rounded-2xl p-10 max-w-md text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h1 className="text-xl font-semibold text-gray-100 mb-3">
              Something went wrong
            </h1>
            <p className="text-sm text-gray-400 mb-6">
              The application encountered an unexpected error. Please refresh the page to try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-accent/20 hover:bg-accent/30 text-accent rounded-lg text-sm font-medium transition-all border border-accent/30"
            >
              Refresh Page
            </button>
            {this.state.error && (
              <p className="mt-4 text-xs text-gray-500 font-mono break-all">
                {this.state.error.message}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
