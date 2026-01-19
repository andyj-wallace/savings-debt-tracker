/**
 * useGoalStats Hook Tests
 *
 * Unit tests for useGoalStats custom hook.
 * Tests goal statistics calculations, progress tracking, and hook behavior.
 */

import React, { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { useGoalStats } from '../useGoalStats';
import { TrackerContext } from '../../context/TrackerContext';
import { TrackerProvider } from '../../context/TrackerProvider';
import type { Transaction, Mode } from '../../types';

interface MockContextValue {
  mode: Mode;
  goal: number;
  current: number;
  transactions: Transaction[];
  pendingInterest?: number;
  remaining?: number;
  percentage?: number;
}

interface WrapperProps {
  children: ReactNode;
}

/**
 * Creates a mock context provider wrapper for testing
 * @param contextValue - The context values to provide
 * @returns Wrapper component for renderHook
 */
const createMockWrapper = (contextValue: Partial<MockContextValue>) => {
  const defaultContext: MockContextValue = {
    mode: 'savings',
    goal: 1000,
    current: 0,
    transactions: [],
    pendingInterest: 0,
    remaining: 1000,
    percentage: 0
  };

  const mergedContext = { ...defaultContext, ...contextValue };

  return function MockWrapper({ children }: WrapperProps): React.ReactElement {
    return (
      <TrackerContext.Provider value={mergedContext as any}>
        {children}
      </TrackerContext.Provider>
    );
  };
};

describe('useGoalStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should calculate savings progress correctly', () => {
    const wrapper = createMockWrapper({
      mode: 'savings',
      goal: 1000,
      current: 250,
      transactions: [
        { id: '1', amount: 100, type: 'transaction', date: new Date().toISOString(), note: 'Test', runningTotal: 100 },
        { id: '2', amount: 150, type: 'transaction', date: new Date().toISOString(), note: 'Test', runningTotal: 250 }
      ]
    });

    const { result } = renderHook(() => useGoalStats(), { wrapper });

    expect(result.current.percentage).toBe(25);
    expect(result.current.remaining).toBe(750);
    expect(result.current.isGoalReached).toBe(false);
    expect(result.current.hasProgress).toBe(true);
  });

  test('should calculate debt progress correctly', () => {
    const wrapper = createMockWrapper({
      mode: 'debt',
      goal: 5000,
      current: -2000, // $2000 paid off
      transactions: [
        { id: '1', amount: -2000, type: 'transaction', date: new Date().toISOString(), note: 'Payment', runningTotal: -2000 }
      ]
    });

    const { result } = renderHook(() => useGoalStats(), { wrapper });

    expect(result.current.percentage).toBe(40); // 40% paid off
    expect(result.current.remaining).toBe(3000); // $3000 remaining
    expect(result.current.isGoalReached).toBe(false);
  });

  test('should handle goal completion', () => {
    const wrapper = createMockWrapper({
      mode: 'savings',
      goal: 1000,
      current: 1000,
      transactions: [
        { id: '1', amount: 1000, type: 'transaction', date: new Date().toISOString(), note: 'Deposit', runningTotal: 1000 }
      ]
    });

    const { result } = renderHook(() => useGoalStats(), { wrapper });

    expect(result.current.percentage).toBe(100);
    expect(result.current.remaining).toBe(0);
    expect(result.current.isGoalReached).toBe(true);
    expect(result.current.isComplete).toBe(true);
  });

  test('should provide detailed statistics for savings mode', () => {
    const wrapper = createMockWrapper({
      mode: 'savings',
      goal: 2000,
      current: 600,
      transactions: [
        { id: '1', amount: 300, type: 'transaction', date: new Date().toISOString(), note: 'Deposit', runningTotal: 300 },
        { id: '2', amount: 300, type: 'transaction', date: new Date().toISOString(), note: 'Deposit', runningTotal: 600 }
      ]
    });

    const { result } = renderHook(() => useGoalStats(), { wrapper });

    const stats = result.current.detailedStats as any;
    expect(stats.mode).toBe('savings');
    expect(stats.saved).toBe(600);
    expect(stats.stillNeeded).toBe(1400);
    expect(stats.progressLabel).toBe('Saved');
    expect(stats.remainingLabel).toBe('Still Needed');
    expect(stats.isPositiveProgress).toBe(true);
  });

  test('should provide detailed statistics for debt mode', () => {
    const wrapper = createMockWrapper({
      mode: 'debt',
      goal: 8000,
      current: -3000, // $3000 paid
      pendingInterest: 25,
      transactions: [
        { id: '1', amount: -3000, type: 'transaction', date: new Date().toISOString(), note: 'Payment', runningTotal: -3000 }
      ]
    });

    const { result } = renderHook(() => useGoalStats(), { wrapper });

    const stats = result.current.detailedStats as any;
    expect(stats.mode).toBe('debt');
    expect(stats.originalDebt).toBe(8000);
    expect(stats.totalPaid).toBe(3000);
    expect(stats.debtPaidOff).toBe(3000);
    expect(stats.debtRemaining).toBe(5000);
    expect(stats.progressLabel).toBe('Paid Off');
    expect(stats.remainingLabel).toBe('Debt Remaining');
    expect(stats.pendingInterest).toBe(25);
  });

  test('should calculate progress milestones', () => {
    const wrapper = createMockWrapper({
      mode: 'savings',
      goal: 1000,
      current: 300,
      transactions: [
        { id: '1', amount: 300, type: 'transaction', date: new Date().toISOString(), note: 'Deposit', runningTotal: 300 }
      ]
    });

    const { result } = renderHook(() => useGoalStats(), { wrapper });

    const milestones = result.current.progressMilestones;

    expect(milestones).toHaveLength(5);
    expect(milestones[0]).toEqual({
      percentage: 25,
      isReached: true, // 30% > 25%
      targetAmount: 250,
      label: '25%',
      description: 'Save $250.00'
    });
    expect(milestones[1]).toEqual({
      percentage: 50,
      isReached: false, // 30% < 50%
      targetAmount: 500,
      label: '50%',
      description: 'Save $500.00'
    });
  });

  test('should provide formatted currency values', () => {
    const wrapper = createMockWrapper({
      mode: 'savings',
      goal: 1500,
      current: 375,
      transactions: [
        { id: '1', amount: 375, type: 'transaction', date: new Date().toISOString(), note: 'Deposit', runningTotal: 375 }
      ]
    });

    const { result } = renderHook(() => useGoalStats(), { wrapper });

    expect(result.current.formattedCurrent).toBe('$375.00');
    expect(result.current.formattedGoal).toBe('$1,500.00');
    expect(result.current.formattedRemaining).toBe('$1,125.00');
    expect(result.current.formattedAmountNeeded).toBe('$1,125.00');
  });

  test('should calculate monthly payment correctly', () => {
    const wrapper = createMockWrapper({
      mode: 'savings',
      goal: 1200,
      current: 200,
      transactions: [
        { id: '1', amount: 200, type: 'transaction', date: new Date().toISOString(), note: 'Deposit', runningTotal: 200 }
      ]
    });

    const { result } = renderHook(() => useGoalStats(), { wrapper });

    const monthlyPayment = result.current.calculateMonthlyPayment(10);

    expect(monthlyPayment.success).toBe(true);
    expect(monthlyPayment.data).toBe(100); // $1000 remaining / 10 months
  });

  test('should handle zero goal gracefully', () => {
    const wrapper = createMockWrapper({
      mode: 'savings',
      goal: 0,
      current: 100,
      transactions: []
    });

    const { result } = renderHook(() => useGoalStats(), { wrapper });

    // Should handle division by zero
    expect(result.current.percentage).toBe(0);
    expect(result.current.remaining).toBe(0);
  });
});

// Integration test with actual TrackerProvider
describe('useGoalStats integration', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  test('should work with TrackerProvider', async () => {
    const wrapper = ({ children }: WrapperProps) => (
      <TrackerProvider>{children}</TrackerProvider>
    );

    const { result } = renderHook(() => useGoalStats(), { wrapper });

    // Wait for async state updates to complete
    await waitFor(() => {
      expect(typeof result.current.percentage).toBe('number');
    });

    // Should have default values from TrackerProvider
    expect(typeof result.current.remaining).toBe('number');
    expect(typeof result.current.isGoalReached).toBe('boolean');
    expect(result.current.detailedStats).toBeDefined();
    expect(result.current.progressMilestones).toBeInstanceOf(Array);
  });
});
