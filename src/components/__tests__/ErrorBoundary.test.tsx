/**
 * ErrorBoundary Component Tests
 *
 * Tests for the ErrorBoundary component to ensure proper error catching,
 * fallback UI rendering, and recovery actions.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';

// Component that throws an error for testing
const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Component that throws specific error types
const ThrowSpecificError: React.FC<{ errorType: string }> = ({ errorType }) => {
  switch (errorType) {
    case 'storage':
      throw new Error('Storage quota exceeded');
    case 'network':
      throw new Error('Network fetch failed');
    case 'calculation':
      throw new Error('Calculation error in math');
    case 'transaction':
      throw new Error('Transaction processing failed');
    case 'chart':
      throw new Error('Chart rendering failed');
    default:
      throw new Error('Generic error occurred');
  }
};

// Suppress console.error during tests since we expect errors
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});

describe('ErrorBoundary', () => {
  describe('Error Catching', () => {
    it('renders children when there is no error', () => {
      render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('catches errors and displays fallback UI', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
    });

    it('displays error details in development mode when showErrorDetails is true', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <ErrorBoundary showErrorDetails={true}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Technical Details (Development)')).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });

    it('does not display error details when showErrorDetails is false', () => {
      render(
        <ErrorBoundary showErrorDetails={false}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.queryByText('Technical Details (Development)')).not.toBeInTheDocument();
    });
  });

  describe('User-Friendly Messages', () => {
    it('shows storage-related message for quota errors', () => {
      render(
        <ErrorBoundary>
          <ThrowSpecificError errorType="storage" />
        </ErrorBoundary>
      );

      expect(screen.getByText(/browser storage is full/i)).toBeInTheDocument();
    });

    it('shows network-related message for fetch errors', () => {
      render(
        <ErrorBoundary>
          <ThrowSpecificError errorType="network" />
        </ErrorBoundary>
      );

      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });

    it('shows calculation-related message for math errors', () => {
      render(
        <ErrorBoundary>
          <ThrowSpecificError errorType="calculation" />
        </ErrorBoundary>
      );

      expect(screen.getByText(/financial calculations/i)).toBeInTheDocument();
    });

    it('shows generic message for unknown errors', () => {
      render(
        <ErrorBoundary>
          <ThrowSpecificError errorType="unknown" />
        </ErrorBoundary>
      );

      // Check for the title which appears once (message appears in both title and body)
      expect(screen.getByRole('heading', { name: /Oops! Something went wrong/i })).toBeInTheDocument();
    });
  });

  describe('Error Severity', () => {
    it('shows high severity indicator for storage errors', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowSpecificError errorType="storage" />
        </ErrorBoundary>
      );

      // High severity uses red color
      const icon = container.querySelector('.bg-red-100');
      expect(icon).toBeInTheDocument();
    });

    it('shows high severity indicator for transaction errors', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowSpecificError errorType="transaction" />
        </ErrorBoundary>
      );

      const icon = container.querySelector('.bg-red-100');
      expect(icon).toBeInTheDocument();
    });

    it('shows medium severity indicator for calculation errors', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowSpecificError errorType="calculation" />
        </ErrorBoundary>
      );

      const icon = container.querySelector('.bg-orange-100');
      expect(icon).toBeInTheDocument();
    });

    it('shows medium severity indicator for chart errors', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowSpecificError errorType="chart" />
        </ErrorBoundary>
      );

      const icon = container.querySelector('.bg-orange-100');
      expect(icon).toBeInTheDocument();
    });

    it('shows low severity indicator for generic errors', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowSpecificError errorType="generic" />
        </ErrorBoundary>
      );

      const icon = container.querySelector('.bg-yellow-100');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Recovery Actions', () => {
    it('renders Reset Application button', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /reset application/i })).toBeInTheDocument();
    });

    it('renders Refresh Page button', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /refresh page/i })).toBeInTheDocument();
    });

    it('clears localStorage when Reset Application is clicked', () => {
      const clearSpy = jest.spyOn(Storage.prototype, 'clear');

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByRole('button', { name: /reset application/i }));

      expect(clearSpy).toHaveBeenCalled();
      clearSpy.mockRestore();
    });

    it('reloads page when Refresh Page is clicked', () => {
      const reloadMock = jest.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: reloadMock },
        writable: true
      });

      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByRole('button', { name: /refresh page/i }));

      expect(reloadMock).toHaveBeenCalled();
    });
  });

  describe('Callbacks', () => {
    it('calls onError callback when error occurs', () => {
      const onErrorMock = jest.fn();

      render(
        <ErrorBoundary onError={onErrorMock}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(onErrorMock).toHaveBeenCalledTimes(1);
      expect(onErrorMock).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String)
        })
      );
    });

    it('passes error and errorInfo to onError callback', () => {
      const onErrorMock = jest.fn();

      render(
        <ErrorBoundary onError={onErrorMock}>
          <ThrowError />
        </ErrorBoundary>
      );

      const [error, errorInfo] = onErrorMock.mock.calls[0];
      expect(error.message).toBe('Test error');
      expect(errorInfo.componentStack).toBeDefined();
    });
  });

  describe('Custom Fallback Component', () => {
    it('renders custom fallback component when provided', () => {
      const CustomFallback: React.FC<{
        error: Error | null;
        resetError: () => void;
        refreshPage: () => void;
      }> = ({ error }) => (
        <div data-testid="custom-fallback">
          Custom Error: {error?.message}
        </div>
      );

      render(
        <ErrorBoundary fallbackComponent={CustomFallback}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByText(/Custom Error: Test error/)).toBeInTheDocument();
    });

    it('passes resetError and refreshPage functions to custom fallback', () => {
      const resetErrorMock = jest.fn();
      const refreshPageMock = jest.fn();

      const CustomFallback: React.FC<{
        error: Error | null;
        resetError: () => void;
        refreshPage: () => void;
      }> = ({ resetError, refreshPage }) => (
        <div>
          <button onClick={resetError}>Custom Reset</button>
          <button onClick={refreshPage}>Custom Refresh</button>
        </div>
      );

      render(
        <ErrorBoundary fallbackComponent={CustomFallback}>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /custom reset/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /custom refresh/i })).toBeInTheDocument();
    });
  });

  describe('Help Text', () => {
    it('displays help text for persistent problems', () => {
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      );

      expect(screen.getByText(/if this problem persists/i)).toBeInTheDocument();
    });
  });
});
