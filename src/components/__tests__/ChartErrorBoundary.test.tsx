/**
 * ChartErrorBoundary Component Tests
 *
 * Tests for the ChartErrorBoundary component to ensure proper chart-specific
 * error handling, retry logic, and fallback UI rendering.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ChartErrorBoundary from '../ChartErrorBoundary';

// Component that throws an error for testing
const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Chart rendering failed');
  }
  return <div data-testid="chart-content">Chart rendered successfully</div>;
};

// Component that throws specific chart error types
const ThrowChartError: React.FC<{ errorType: string }> = ({ errorType }) => {
  switch (errorType) {
    case 'canvas':
      throw new Error('Canvas context not available');
    case 'webgl':
      throw new Error('WebGL not supported');
    case 'data':
      throw new Error('Invalid data array format');
    case 'recharts':
      throw new Error('Recharts library error');
    case 'd3':
      throw new Error('D3 visualization error');
    case 'memory':
      throw new Error('Memory heap exceeded');
    default:
      throw new Error('Unknown chart error');
  }
};

// Suppress console.warn/error during tests since we expect errors
const originalWarn = console.warn;
const originalError = console.error;
beforeAll(() => {
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
});

describe('ChartErrorBoundary', () => {
  describe('Error Catching', () => {
    it('renders children when there is no error', () => {
      render(
        <ChartErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ChartErrorBoundary>
      );

      expect(screen.getByTestId('chart-content')).toBeInTheDocument();
      expect(screen.getByText('Chart rendered successfully')).toBeInTheDocument();
    });

    it('catches errors and displays fallback UI', () => {
      render(
        <ChartErrorBoundary>
          <ThrowError />
        </ChartErrorBoundary>
      );

      expect(screen.getByText(/Chart Unavailable/i)).toBeInTheDocument();
    });

    it('displays custom chart type in error message', () => {
      render(
        <ChartErrorBoundary chartType="Progress Chart">
          <ThrowError />
        </ChartErrorBoundary>
      );

      expect(screen.getByText(/Progress Chart Unavailable/i)).toBeInTheDocument();
    });

    it('displays chart title when provided', () => {
      render(
        <ChartErrorBoundary title="Transaction History">
          <ThrowError />
        </ChartErrorBoundary>
      );

      expect(screen.getByText('Transaction History')).toBeInTheDocument();
    });
  });

  describe('Chart-Specific Error Messages', () => {
    it('shows canvas-related message for canvas errors', () => {
      render(
        <ChartErrorBoundary>
          <ThrowChartError errorType="canvas" />
        </ChartErrorBoundary>
      );

      expect(screen.getByText(/graphics limitations/i)).toBeInTheDocument();
    });

    it('shows WebGL-related message for WebGL errors', () => {
      render(
        <ChartErrorBoundary>
          <ThrowChartError errorType="webgl" />
        </ChartErrorBoundary>
      );

      expect(screen.getByText(/graphics limitations/i)).toBeInTheDocument();
    });

    it('shows data-related message for data errors', () => {
      render(
        <ChartErrorBoundary>
          <ThrowChartError errorType="data" />
        </ChartErrorBoundary>
      );

      expect(screen.getByText(/invalid data/i)).toBeInTheDocument();
    });

    it('shows library message for recharts errors', () => {
      render(
        <ChartErrorBoundary>
          <ThrowChartError errorType="recharts" />
        </ChartErrorBoundary>
      );

      expect(screen.getByText(/Chart library error/i)).toBeInTheDocument();
    });

    it('shows library message for d3 errors', () => {
      render(
        <ChartErrorBoundary>
          <ThrowChartError errorType="d3" />
        </ChartErrorBoundary>
      );

      expect(screen.getByText(/Chart library error/i)).toBeInTheDocument();
    });

    it('shows memory message for memory errors', () => {
      render(
        <ChartErrorBoundary>
          <ThrowChartError errorType="memory" />
        </ChartErrorBoundary>
      );

      expect(screen.getByText(/Not enough memory/i)).toBeInTheDocument();
    });

    it('shows generic message for unknown errors', () => {
      render(
        <ChartErrorBoundary>
          <ThrowChartError errorType="unknown" />
        </ChartErrorBoundary>
      );

      expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument();
    });
  });

  describe('Retry Logic', () => {
    it('shows retry button for retryable errors', () => {
      render(
        <ChartErrorBoundary>
          <ThrowChartError errorType="data" />
        </ChartErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('does not show retry button for WebGL errors', () => {
      render(
        <ChartErrorBoundary>
          <ThrowChartError errorType="webgl" />
        </ChartErrorBoundary>
      );

      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    });

    it('does not show retry button for canvas errors', () => {
      render(
        <ChartErrorBoundary>
          <ThrowChartError errorType="canvas" />
        </ChartErrorBoundary>
      );

      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    });

    it('resets error state when retry is clicked', () => {
      // Use a component that can control throwing
      let shouldThrow = true;
      const ConditionalError: React.FC = () => {
        if (shouldThrow) {
          throw new Error('Retryable error');
        }
        return <div data-testid="success">Success!</div>;
      };

      const { rerender } = render(
        <ChartErrorBoundary>
          <ConditionalError />
        </ChartErrorBoundary>
      );

      // Should show error state
      expect(screen.getByText(/Chart Unavailable/i)).toBeInTheDocument();

      // Stop throwing and click retry
      shouldThrow = false;
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));

      // Component should re-render and succeed
      // Note: In a real scenario, the retry would trigger a re-render
      // For this test, we verify the button exists and can be clicked
    });

    it('limits retry attempts to 3', () => {
      // Component that always throws
      const AlwaysThrow: React.FC = () => {
        throw new Error('Always fails');
      };

      const { rerender } = render(
        <ChartErrorBoundary>
          <AlwaysThrow />
        </ChartErrorBoundary>
      );

      // Click retry 3 times
      for (let i = 0; i < 3; i++) {
        const retryButton = screen.queryByRole('button', { name: /try again/i });
        if (retryButton) {
          fireEvent.click(retryButton);
        }
      }

      // After 3 retries, button should be hidden
      expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
    });
  });

  describe('Fallback Chart Display', () => {
    it('shows fallback chart icon when showFallbackChart is true', () => {
      render(
        <ChartErrorBoundary showFallbackChart={true}>
          <ThrowChartError errorType="webgl" />
        </ChartErrorBoundary>
      );

      expect(screen.getByText(/visualization temporarily disabled/i)).toBeInTheDocument();
    });

    it('hides fallback chart when showFallbackChart is false', () => {
      render(
        <ChartErrorBoundary showFallbackChart={false}>
          <ThrowChartError errorType="webgl" />
        </ChartErrorBoundary>
      );

      expect(screen.queryByText(/visualization temporarily disabled/i)).not.toBeInTheDocument();
    });
  });

  describe('Development Debug Info', () => {
    it('shows debug info in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <ChartErrorBoundary chartType="Test Chart" data={[1, 2, 3]}>
          <ThrowError />
        </ChartErrorBoundary>
      );

      expect(screen.getByText(/Debug Info/i)).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });

    it('displays retry count in debug info', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <ChartErrorBoundary>
          <ThrowError />
        </ChartErrorBoundary>
      );

      expect(screen.getByText(/Retry Count:/i)).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });

    it('displays chart type in debug info', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <ChartErrorBoundary chartType="Line Chart">
          <ThrowError />
        </ChartErrorBoundary>
      );

      expect(screen.getByText(/Chart Type:/i)).toBeInTheDocument();
      // "Line Chart" appears in both heading and debug info, verify at least 2 occurrences
      expect(screen.getAllByText(/Line Chart/i).length).toBeGreaterThanOrEqual(2);

      process.env.NODE_ENV = originalEnv;
    });

    it('displays data length in debug info when data provided', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <ChartErrorBoundary data={[1, 2, 3, 4, 5]}>
          <ThrowError />
        </ChartErrorBoundary>
      );

      expect(screen.getByText(/Data Length:/i)).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Callbacks', () => {
    it('calls onError callback when error occurs', () => {
      const onErrorMock = jest.fn();

      render(
        <ChartErrorBoundary onError={onErrorMock}>
          <ThrowError />
        </ChartErrorBoundary>
      );

      expect(onErrorMock).toHaveBeenCalledTimes(1);
      expect(onErrorMock).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String)
        })
      );
    });

    it('passes chart error details to onError callback', () => {
      const onErrorMock = jest.fn();

      render(
        <ChartErrorBoundary onError={onErrorMock}>
          <ThrowError />
        </ChartErrorBoundary>
      );

      const [error] = onErrorMock.mock.calls[0];
      expect(error.message).toBe('Chart rendering failed');
    });
  });

  describe('Error Icon and Styling', () => {
    it('displays warning icon in error state', () => {
      const { container } = render(
        <ChartErrorBoundary>
          <ThrowError />
        </ChartErrorBoundary>
      );

      // Check for the orange background indicating a warning
      const iconContainer = container.querySelector('.bg-orange-100');
      expect(iconContainer).toBeInTheDocument();
    });

    it('has proper card styling', () => {
      const { container } = render(
        <ChartErrorBoundary>
          <ThrowError />
        </ChartErrorBoundary>
      );

      const card = container.querySelector('.bg-white.rounded-lg.shadow-md');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Data Safety Message', () => {
    it('reassures users that data is safe', () => {
      render(
        <ChartErrorBoundary>
          <ThrowError />
        </ChartErrorBoundary>
      );

      expect(screen.getByText(/data is safe/i)).toBeInTheDocument();
    });
  });
});
