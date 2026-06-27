'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg-primary)]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full p-6 rounded-2xl glass border border-[var(--border-color)] text-center space-y-4 shadow-xl"
          >
            <div className="w-12 h-12 rounded-full bg-[var(--color-error-500)]/20 flex items-center justify-center mx-auto">
              <AlertTriangle className="text-[var(--color-error-400)]" size={24} />
            </div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Something went wrong</h2>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              An unexpected error occurred in the application: {this.state.error?.message || 'Unknown error'}
            </p>
            <motion.button
              onClick={this.handleReset}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-[var(--color-primary-500)] hover:bg-[var(--color-primary-600)] text-white rounded-xl text-xs font-semibold mx-auto transition-colors cursor-pointer"
              whileTap={{ scale: 0.95 }}
            >
              <RotateCcw size={14} />
              Reload Application
            </motion.button>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}
