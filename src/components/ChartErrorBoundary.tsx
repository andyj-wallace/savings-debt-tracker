/**
 * ChartErrorBoundary Component
 *
 * Specialized Error Boundary for chart components that provides chart-specific
 * error handling and fallback UI. Handles common chart rendering issues like
 * invalid data, missing dependencies, or rendering failures.
 *
 * @fileoverview Chart-specific error boundary implementation
 */

import React from 'react';
import { BarChart3, AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * ChartErrorBoundary Class Component
 * Specialized error boundary for chart components
 */
class ChartErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0
    };
  }

  /**
   * Static method to update state when an error occurs
   * @param {Error} error - The error that was thrown
   * @returns {Object} New state object
   */
  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error
    };
  }

  /**
   * Component lifecycle method called when an error occurs
   * @param {Error} error - The error that was thrown
   * @param {Object} errorInfo - Information about the error
   */
  componentDidCatch(error, errorInfo) {
    console.warn('ChartErrorBoundary caught a chart error:', error);
    console.warn('Chart error info:', errorInfo);

    // Log chart-specific error details
    this.logChartError(error, errorInfo);
  }

  /**
   * Log chart-specific error information
   * @param {Error} error - The error that was thrown
   * @param {Object} errorInfo - Information about the error
   */
  logChartError(error, errorInfo) {
    const chartErrorData = {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      chartType: this.props.chartType || 'unknown',
      dataLength: this.props.data?.length || 0
    };

    console.log('Chart Error Details:', chartErrorData);

    // Future: Send to error logging service
    if (process.env.NODE_ENV === 'production') {
      // Would send to logging service
    }
  }

  /**
   * Handle retry action
   */
  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  /**
   * Get chart-specific error message
   * @param {Error} error - The error that occurred
   * @returns {string} Chart-specific error message
   */
  getChartErrorMessage(error) {
    const errorMessage = error?.message?.toLowerCase() || '';

    // Canvas/rendering errors
    if (errorMessage.includes('canvas') || errorMessage.includes('webgl')) {
      return 'Unable to render chart due to graphics limitations. Try refreshing the page.';
    }

    // Data-related errors
    if (errorMessage.includes('data') || errorMessage.includes('array')) {
      return 'Chart cannot be displayed due to invalid data. Your transaction data is safe.';
    }

    // Library errors
    if (errorMessage.includes('recharts') || errorMessage.includes('d3')) {
      return 'Chart library error occurred. The chart is temporarily unavailable.';
    }

    // Memory errors
    if (errorMessage.includes('memory') || errorMessage.includes('heap')) {
      return 'Not enough memory to render chart. Try refreshing the page.';
    }

    // Generic chart error
    return 'Chart temporarily unavailable. Your data is safe and other features still work.';
  }

  /**
   * Determine if retry should be available based on error type and retry count
   * @param {Error} error - The error that occurred
   * @returns {boolean} Whether retry option should be shown
   */
  shouldShowRetry(error) {
    const errorMessage = error?.message?.toLowerCase() || '';
    const maxRetries = 3;

    // Don't retry for certain error types
    if (errorMessage.includes('webgl') || errorMessage.includes('canvas')) {
      return false;
    }

    // Limit retry attempts
    return this.state.retryCount < maxRetries;
  }

  render() {
    if (this.state.hasError) {
      const { error } = this.state;
      const { chartType = 'Chart', showFallbackChart = true } = this.props;

      const errorMessage = this.getChartErrorMessage(error);
      const canRetry = this.shouldShowRetry(error);

      return (
        <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
          {/* Chart header (if provided) */}
          {this.props.title && (
            <h3 className="text-lg font-semibold text-slate-700 mb-4">
              {this.props.title}
            </h3>
          )}

          {/* Error content */}
          <div className="flex flex-col items-center justify-center py-8 text-center">
            {/* Error icon */}
            <div className="mb-4 p-3 bg-orange-100 rounded-full">
              <AlertTriangle size={24} className="text-orange-600" />
            </div>

            {/* Error message */}
            <h4 className="text-sm font-medium text-slate-800 mb-2">
              {chartType} Unavailable
            </h4>
            <p className="text-sm text-slate-600 mb-4 max-w-sm">
              {errorMessage}
            </p>

            {/* Retry button */}
            {canRetry && (
              <button
                onClick={this.handleRetry}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <RefreshCw size={16} />
                Try Again
              </button>
            )}

            {/* Fallback chart representation */}
            {showFallbackChart && !canRetry && (
              <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                <BarChart3 size={48} className="text-slate-400 mx-auto mb-2" />
                <p className="text-xs text-slate-500">
                  Chart visualization temporarily disabled
                </p>
              </div>
            )}

            {/* Development error details */}
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4 w-full">
                <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-700">
                  Debug Info (Development)
                </summary>
                <div className="mt-2 p-2 bg-slate-100 rounded text-xs font-mono text-left">
                  <div><strong>Error:</strong> {error?.message}</div>
                  <div><strong>Retry Count:</strong> {this.state.retryCount}</div>
                  <div><strong>Chart Type:</strong> {chartType}</div>
                  {this.props.data && (
                    <div><strong>Data Length:</strong> {this.props.data.length}</div>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    // No error occurred, render children normally
    return this.props.children;
  }
}

export default ChartErrorBoundary;