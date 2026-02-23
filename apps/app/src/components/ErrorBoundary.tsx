'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  section?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // In production this would send to an observability service (e.g. Sentry)
    console.error(`[ErrorBoundary:${this.props.section ?? 'App'}] Uncaught render error:`, error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-destructive/30 bg-destructive/5 text-center gap-4 m-4">
          <div className="text-3xl">⚠️</div>
          <div>
            <h3 className="text-lg font-semibold text-destructive">
              {this.props.section ? `${this.props.section} failed to load` : 'Something went wrong'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 font-mono">
              {this.state.error?.message ?? 'An unexpected error occurred.'}
            </p>
          </div>
          <button
            onClick={this.handleReset}
            className="px-4 py-2 text-sm font-medium rounded-md bg-destructive/20 hover:bg-destructive/30 text-destructive border border-destructive/30 transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
