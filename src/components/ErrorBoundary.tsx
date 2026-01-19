/**
 * ErrorBoundary Component
 *
 * React Error Boundary component that catches JavaScript errors anywhere in the
 * child component tree, logs those errors, and displays a fallback UI instead
 * of the component tree that crashed.
 *
 * @fileoverview Main application error boundary implementation
 */

import React, { ReactNode, ErrorInfo, ComponentType } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { CSS_CLASSES } from '../constants';
import { buttonPresets } from '../styles/buttonStyles';
import { cardPresets } from '../styles/cardStyles';

/**
 * Props for custom fallback components
 */
export interface FallbackComponentProps {
  error: Error | null;
  resetError: () => void;
  refreshPage: () => void;
}

/**
 * Props for the ErrorBoundary component
 */
export interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackComponent?: ComponentType<FallbackComponentProps>;
  showErrorDetails?: boolean;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

/**
 * State for the ErrorBoundary component
 */
export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: number | null;
}

/**
 * Error severity levels
 */
export type ErrorSeverity = 'high' | 'medium' | 'low';

/**
 * ErrorBoundary Class Component
 * Catches errors in child components and displays fallback UI
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  /**
   * Static method to update state when an error occurs
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: Date.now() // Unique ID for this error occurrence
    };
  }

  /**
   * Component lifecycle method called when an error occurs
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error info:', errorInfo);

    // Update state with error details
    this.setState({
      error,
      errorInfo
    });

    // Call optional onError callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to external service in production (placeholder for future implementation)
    if (process.env.NODE_ENV === 'production') {
      // Future: Send to error logging service
      this.logErrorToService(error, errorInfo);
    }
  }

  /**
   * Placeholder for future error logging service integration
   */
  logErrorToService(error: Error, errorInfo: ErrorInfo): void {
    // Future implementation: send to logging service
    console.log('Would log to service:', { error, errorInfo });
  }

  /**
   * Handle refresh page action
   */
  handleRefresh = () => {
    // Reset error boundary state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });

    // Reload the page to reset application state
    window.location.reload();
  };

  /**
   * Handle reset application action (without page reload)
   */
  handleReset = () => {
    // Reset error boundary state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });

    // Clear localStorage to reset application state
    try {
      localStorage.clear();
    } catch (err) {
      console.warn('Failed to clear localStorage:', err);
    }
  };

  /**
   * Get user-friendly error message based on error type
   */
  getUserFriendlyMessage(error: Error | null): string {
    const errorMessage = error?.message?.toLowerCase() || '';

    // Storage quota exceeded
    if (errorMessage.includes('quota') || errorMessage.includes('storage')) {
      return 'Your browser storage is full. Try clearing some data or refreshing the page.';
    }

    // Network errors
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return 'There was a network error. Please check your connection and try again.';
    }

    // Calculation errors
    if (errorMessage.includes('calculation') || errorMessage.includes('math')) {
      return 'There was an error with the financial calculations. Please refresh and try again.';
    }

    // Generic error
    return 'Something went wrong. Don\'t worry, your data is safe. Try refreshing the page.';
  }

  /**
   * Get error severity level
   */
  getErrorSeverity(error: Error | null): ErrorSeverity {
    const errorMessage = error?.message?.toLowerCase() || '';

    // High severity: data loss risk
    if (errorMessage.includes('storage') || errorMessage.includes('transaction')) {
      return 'high';
    }

    // Medium severity: feature impairment
    if (errorMessage.includes('calculation') || errorMessage.includes('chart')) {
      return 'medium';
    }

    // Low severity: display issues
    return 'low';
  }

  render(): ReactNode {
    if (this.state.hasError) {
      const { error } = this.state;
      const { fallbackComponent: FallbackComponent, showErrorDetails = false } = this.props;

      const userMessage = this.getUserFriendlyMessage(error);
      const severity = this.getErrorSeverity(error);

      // Use custom fallback component if provided
      if (FallbackComponent) {
        return (
          <FallbackComponent
            error={error}
            resetError={this.handleReset}
            refreshPage={this.handleRefresh}
          />
        );
      }

      // Default error boundary UI
      return (
        <div className={CSS_CLASSES.CONTAINERS.MAIN}>
          <div className={CSS_CLASSES.CONTAINERS.CONTENT}>
            <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
              {/* Error Icon */}
              <div className={`mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center ${
                severity === 'high' ? 'bg-red-100' :
                severity === 'medium' ? 'bg-orange-100' : 'bg-yellow-100'
              }`}>
                <AlertTriangle
                  size={32}
                  className={
                    severity === 'high' ? 'text-red-600' :
                    severity === 'medium' ? 'text-orange-600' : 'text-yellow-600'
                  }
                />
              </div>

              {/* Error Title */}
              <h2 className="text-xl font-bold text-slate-800 mb-2">
                Oops! Something went wrong
              </h2>

              {/* User-friendly message */}
              <p className="text-slate-600 mb-6">
                {userMessage}
              </p>

              {/* Error details (development only) */}
              {showErrorDetails && process.env.NODE_ENV === 'development' && (
                <details className="mb-6 text-left">
                  <summary className="cursor-pointer text-sm text-slate-500 hover:text-slate-700">
                    Technical Details (Development)
                  </summary>
                  <div className="mt-2 p-3 bg-slate-100 rounded text-xs font-mono text-slate-700">
                    <div className="mb-2">
                      <strong>Error:</strong> {error?.message}
                    </div>
                    {error?.stack && (
                      <div className="mb-2">
                        <strong>Stack:</strong>
                        <pre className="mt-1 whitespace-pre-wrap">{error.stack}</pre>
                      </div>
                    )}
                    {this.state.errorInfo?.componentStack && (
                      <div>
                        <strong>Component Stack:</strong>
                        <pre className="mt-1 whitespace-pre-wrap">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={this.handleReset}
                  className={`flex-1 flex items-center justify-center gap-2 ${buttonPresets.formSubmit()}`}
                >
                  <Home size={16} />
                  Reset Application
                </button>
                <button
                  onClick={this.handleRefresh}
                  className={`flex-1 flex items-center justify-center gap-2 ${buttonPresets.formCancel()}`}
                >
                  <RefreshCw size={16} />
                  Refresh Page
                </button>
              </div>

              {/* Help text */}
              <p className="mt-4 text-xs text-slate-500">
                If this problem persists, try clearing your browser data or contact support.
              </p>
            </div>
          </div>
        </div>
      );
    }

    // No error occurred, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;