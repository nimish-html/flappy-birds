'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

/**
 * Error boundary component that catches JavaScript errors anywhere in the child component tree
 * and displays a fallback UI instead of crashing the entire application
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error info:', errorInfo);
    
    // Update state with error info
    this.setState({
      errorInfo
    });
    
    // Call optional error callback
    this.props.onError?.(error, errorInfo);
    
    // Report error to monitoring service (if available)
    this.reportError(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;
    
    // Reset error state if resetKeys have changed
    if (hasError && resetOnPropsChange && resetKeys) {
      const prevResetKeys = prevProps.resetKeys || [];
      const hasResetKeyChanged = resetKeys.some((key, index) => 
        key !== prevResetKeys[index]
      );
      
      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      window.clearTimeout(this.resetTimeoutId);
    }
  }

  /**
   * Report error to external monitoring service
   */
  private reportError(error: Error, errorInfo: ErrorInfo): void {
    // In a real application, you would send this to a service like Sentry, LogRocket, etc.
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      errorId: this.state.errorId
    };
    
    // For now, just log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Report');
      console.error('Error Details:', errorReport);
      console.groupEnd();
    }
    
    // In production, you would send this to your error tracking service
    // Example: Sentry.captureException(error, { extra: errorReport });
  }

  /**
   * Reset the error boundary state
   */
  private resetErrorBoundary = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    });
  };

  /**
   * Auto-reset after a delay (useful for transient errors)
   */
  private scheduleAutoReset = (delay: number = 5000): void => {
    if (this.resetTimeoutId) {
      window.clearTimeout(this.resetTimeoutId);
    }
    
    this.resetTimeoutId = window.setTimeout(() => {
      this.resetErrorBoundary();
    }, delay);
  };

  /**
   * Render fallback UI or children
   */
  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // Custom fallback UI
      if (fallback) {
        return fallback;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg 
                  className="h-8 w-8 text-red-500" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-red-800">
                  Game Error
                </h3>
              </div>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-red-700 mb-2">
                Something went wrong while running the game. This might be due to:
              </p>
              <ul className="text-xs text-red-600 list-disc list-inside space-y-1">
                <li>Browser compatibility issues</li>
                <li>Insufficient system resources</li>
                <li>Temporary network problems</li>
                <li>Canvas rendering errors</li>
              </ul>
            </div>

            {process.env.NODE_ENV === 'development' && error && (
              <details className="mb-4 p-3 bg-red-100 rounded text-xs">
                <summary className="cursor-pointer font-medium text-red-800 mb-2">
                  Error Details (Development)
                </summary>
                <div className="space-y-2">
                  <div>
                    <strong>Error:</strong> {error.message}
                  </div>
                  {error.stack && (
                    <div>
                      <strong>Stack:</strong>
                      <pre className="mt-1 text-xs overflow-auto max-h-32 bg-white p-2 rounded border">
                        {error.stack}
                      </pre>
                    </div>
                  )}
                  {errorInfo?.componentStack && (
                    <div>
                      <strong>Component Stack:</strong>
                      <pre className="mt-1 text-xs overflow-auto max-h-32 bg-white p-2 rounded border">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className="flex space-x-3">
              <button
                onClick={this.resetErrorBoundary}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded text-sm transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded text-sm transition-colors"
              >
                Reload Page
              </button>
            </div>
            
            <button
              onClick={() => this.scheduleAutoReset(1000)}
              className="w-full mt-2 text-xs text-red-600 hover:text-red-800 underline"
            >
              Auto-retry in 1 second
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}

/**
 * Hook version of ErrorBoundary for functional components
 */
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

export default ErrorBoundary;