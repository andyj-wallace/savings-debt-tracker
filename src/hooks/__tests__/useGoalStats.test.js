/**
 * useGoalStats Hook Tests
 *
 * Unit tests for useGoalStats custom hook.
 * Tests goal statistics calculations, progress tracking, and hook behavior.
 */

import { renderHook } from '@testing-library/react';
import { useGoalStats } from '../useGoalStats';
import { TrackerProvider } from '../../context/TrackerProvider';

// Mock the TrackerContext with test data
const createWrapper = (initialState = {}) => {
  const defaultState = {
    mode: 'savings',
    goal: 1000,
    current: 250,
    transactions: [
      { id: 1, amount: 100, type: 'transaction' },
      { id: 2, amount: 150, type: 'transaction' }
    ],
    pendingInterest: 0
  };

  const mockContext = { ...defaultState, ...initialState };

  // Mock useTrackerContext
  const MockProvider = ({ children }) => {
    // This would normally be provided by TrackerProvider
    return children;
  };

  // For this test, we'll mock the useTrackerContext hook
  jest.mock('../../context/TrackerContext', () => ({
    useTrackerContext: () => mockContext
  }));

  return MockProvider;
};

describe('useGoalStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should calculate savings progress correctly', () => {
    const wrapper = createWrapper({
      mode: 'savings',
      goal: 1000,
      current: 250
    });

    const { result } = renderHook(() => useGoalStats(), { wrapper });

    expect(result.current.percentage).toBe(25);
    expect(result.current.remaining).toBe(750);
    expect(result.current.isGoalReached).toBe(false);
    expect(result.current.hasProgress).toBe(true);
  });

  test('should calculate debt progress correctly', () => {
    const wrapper = createWrapper({
      mode: 'debt',
      goal: 5000,
      current: -2000 // $2000 paid off
    });

    const { result } = renderHook(() => useGoalStats(), { wrapper });

    expect(result.current.percentage).toBe(40); // 40% paid off
    expect(result.current.remaining).toBe(3000); // $3000 remaining
    expect(result.current.isGoalReached).toBe(false);
  });

  test('should handle goal completion', () => {
    const wrapper = createWrapper({
      mode: 'savings',
      goal: 1000,
      current: 1000
    });

    const { result } = renderHook(() => useGoalStats(), { wrapper });

    expect(result.current.percentage).toBe(100);
    expect(result.current.remaining).toBe(0);
    expect(result.current.isGoalReached).toBe(true);
    expect(result.current.isComplete).toBe(true);
  });

  test('should provide detailed statistics for savings mode', () => {
    const wrapper = createWrapper({
      mode: 'savings',
      goal: 2000,
      current: 600,
      transactions: [
        { id: 1, amount: 300, type: 'transaction' },
        { id: 2, amount: 300, type: 'transaction' }
      ]
    });

    const { result } = renderHook(() => useGoalStats(), { wrapper });

    expect(result.current.detailedStats.mode).toBe('savings');
    expect(result.current.detailedStats.saved).toBe(600);
    expect(result.current.detailedStats.stillNeeded).toBe(1400);
    expect(result.current.detailedStats.progressLabel).toBe('Saved');
    expect(result.current.detailedStats.remainingLabel).toBe('Still Needed');
    expect(result.current.detailedStats.isPositiveProgress).toBe(true);
  });

  test('should provide detailed statistics for debt mode', () => {
    const wrapper = createWrapper({
      mode: 'debt',
      goal: 8000,
      current: -3000, // $3000 paid
      pendingInterest: 25
    });

    const { result } = renderHook(() => useGoalStats(), { wrapper });

    expect(result.current.detailedStats.mode).toBe('debt');
    expect(result.current.detailedStats.originalDebt).toBe(8000);
    expect(result.current.detailedStats.totalPaid).toBe(3000);
    expect(result.current.detailedStats.debtPaidOff).toBe(3000);
    expect(result.current.detailedStats.debtRemaining).toBe(5000);
    expect(result.current.detailedStats.progressLabel).toBe('Paid Off');
    expect(result.current.detailedStats.remainingLabel).toBe('Debt Remaining');
    expect(result.current.detailedStats.pendingInterest).toBe(25);
  });

  test('should calculate progress milestones', () => {
    const wrapper = createWrapper({
      mode: 'savings',
      goal: 1000,
      current: 300
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
    const wrapper = createWrapper({
      mode: 'savings',
      goal: 1500,
      current: 375
    });

    const { result } = renderHook(() => useGoalStats(), { wrapper });

    expect(result.current.formattedCurrent).toBe('$375.00');
    expect(result.current.formattedGoal).toBe('$1,500.00');
    expect(result.current.formattedRemaining).toBe('$1,125.00');
    expect(result.current.formattedAmountNeeded).toBe('$1,125.00');
  });

  test('should calculate monthly payment correctly', () => {
    const wrapper = createWrapper({
      mode: 'savings',
      goal: 1200,
      current: 200
    });

    const { result } = renderHook(() => useGoalStats(), { wrapper });

    const monthlyPayment = result.current.calculateMonthlyPayment(10);

    expect(monthlyPayment.success).toBe(true);
    expect(monthlyPayment.data).toBe(100); // $1000 remaining / 10 months
  });

  test('should handle zero goal gracefully', () => {
    const wrapper = createWrapper({
      mode: 'savings',
      goal: 0,
      current: 100
    });

    const { result } = renderHook(() => useGoalStats(), { wrapper });

    // Should handle division by zero
    expect(result.current.percentage).toBe(0);
    expect(result.current.remaining).toBe(0);
  });
});

// Integration test with actual TrackerProvider
describe('useGoalStats integration', () => {
  test('should work with TrackerProvider', () => {
    const wrapper = ({ children }) => (
      <TrackerProvider>{children}</TrackerProvider>
    );

    const { result } = renderHook(() => useGoalStats(), { wrapper });

    // Should have default values from TrackerProvider
    expect(typeof result.current.percentage).toBe('number');
    expect(typeof result.current.remaining).toBe('number');
    expect(typeof result.current.isGoalReached).toBe('boolean');
    expect(result.current.detailedStats).toBeDefined();
    expect(result.current.progressMilestones).toBeInstanceOf(Array);
  });
});