import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ErrorBoundary, withErrorBoundary } from '../../components/ErrorBoundary';

// Mock console methods to avoid noise in tests
const originalConsoleError = console.error;
const originalConsoleGroup = console.group;
const originalConsoleGroupEnd = console.groupEnd;

beforeEach(() => {
  console.error = vi.fn();
  console.group = vi.fn();
  console.groupEnd = vi.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
  console.group = originalConsoleGroup;
  console.groupEnd = originalConsoleGroupEnd;
  vi.clearAllMocks();
});

// Test component that throws an error
const ThrowError: React.FC<{ shouldThrow?: boolean; message?: string }> = ({ 
  shouldThrow = false, 
  message = 'Test error' 
}) => {
  if (shouldThrow) {
    throw new Error(message);
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  describe('normal operation', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('should not show error UI when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
      expect(screen.queryByText('Game Error')).not.toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('should catch and display error when child component throws', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} message="Component crashed" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Game Error')).toBeInTheDocument();
      expect(screen.getByText(/Something went wrong while running the game/)).toBeInTheDocument();
    });

    it('should call onError callback when error occurs', () => {
      const onError = vi.fn();
      
      render(
        <ErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} message="Callback test" />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Callback test'
        }),
        expect.objectContaining({
          componentStack: expect.any(String)
        })
      );
    });

    it('should log error details to console', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} message="Console test" />
        </ErrorBoundary>
      );

      expect(console.error).toHaveBeenCalledWith(
        'ErrorBoundary caught an error:',
        expect.objectContaining({
          message: 'Console test'
        })
      );
    });

    it('should show error details in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} message="Dev mode error" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Error Details (Development)')).toBeInTheDocument();
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should hide error details in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} message="Prod mode error" />
        </ErrorBoundary>
      );

      expect(screen.queryByText('Error Details (Development)')).not.toBeInTheDocument();
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('error recovery', () => {
    it('should show Try Again button when error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Try Again')).toBeInTheDocument();
      expect(screen.getByText('Reload Page')).toBeInTheDocument();
    });

    it('should reload page when Reload Page is clicked', () => {
      // Mock window.location.reload
      const mockReload = vi.fn();
      Object.defineProperty(window, 'location', {
        value: {
          reload: mockReload
        },
        writable: true
      });

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByText('Reload Page'));

      expect(mockReload).toHaveBeenCalled();
    });

    it('should show auto-retry button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Auto-retry in 1 second')).toBeInTheDocument();
    });
  });

  describe('reset on props change', () => {
    it('should reset error when resetKeys change', () => {
      let resetKey = 'key1';
      
      const { rerender } = render(
        <ErrorBoundary resetOnPropsChange={true} resetKeys={[resetKey]}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Game Error')).toBeInTheDocument();

      // Change reset key and rerender with non-throwing component
      resetKey = 'key2';
      rerender(
        <ErrorBoundary resetOnPropsChange={true} resetKeys={[resetKey]}>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('should not reset error when resetKeys remain the same', () => {
      const resetKey = 'unchangedKey';
      
      const { rerender } = render(
        <ErrorBoundary resetOnPropsChange={true} resetKeys={[resetKey]}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Game Error')).toBeInTheDocument();

      // Rerender with same reset key
      rerender(
        <ErrorBoundary resetOnPropsChange={true} resetKeys={[resetKey]}>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );

      // Should still show error
      expect(screen.getByText('Game Error')).toBeInTheDocument();
    });
  });

  describe('custom fallback', () => {
    it('should render custom fallback when provided', () => {
      const customFallback = <div>Custom error message</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
      expect(screen.queryByText('Game Error')).not.toBeInTheDocument();
    });
  });

  describe('withErrorBoundary HOC', () => {
    it('should wrap component with error boundary', () => {
      const WrappedComponent = withErrorBoundary(ThrowError);

      render(<WrappedComponent shouldThrow={false} />);

      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('should catch errors in wrapped component', () => {
      const WrappedComponent = withErrorBoundary(ThrowError);

      render(<WrappedComponent shouldThrow={true} />);

      expect(screen.getByText('Game Error')).toBeInTheDocument();
    });

    it('should pass through error boundary props', () => {
      const onError = vi.fn();
      const WrappedComponent = withErrorBoundary(ThrowError, { onError });

      render(<WrappedComponent shouldThrow={true} />);

      expect(onError).toHaveBeenCalled();
    });

    it('should set correct display name', () => {
      const TestComponent = () => <div>Test</div>;
      TestComponent.displayName = 'TestComponent';
      
      const WrappedComponent = withErrorBoundary(TestComponent);
      
      expect(WrappedComponent.displayName).toBe('withErrorBoundary(TestComponent)');
    });
  });

  describe('cleanup', () => {
    it('should clear timeout on unmount', () => {
      vi.useFakeTimers();
      const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');

      const { unmount } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Trigger auto-reset
      fireEvent.click(screen.getByText('Auto-retry in 1 second'));

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();

      vi.useRealTimers();
      clearTimeoutSpy.mockRestore();
    });
  });

  describe('error reporting', () => {
    it('should generate error report with correct structure', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} message="Report test" />
        </ErrorBoundary>
      );

      // Check that console.group was called for error report
      expect(console.group).toHaveBeenCalledWith('🚨 Error Report');

      process.env.NODE_ENV = originalEnv;
    });
  });
});