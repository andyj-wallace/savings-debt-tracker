/**
 * useGoalStats Hook
 *
 * Custom hook that encapsulates goal statistics and progress calculations.
 * Provides memoized financial calculations, progress tracking, and goal-related
 * statistics by composing TrackerContext with CalculationService.
 *
 * @fileoverview Goal statistics and progress tracking custom hook
 */

import { useMemo, useCallback } from 'react';
import { useTrackerContext } from '../context/TrackerContext';
import CalculationService from '../services/CalculationService';
import { MODES } from '../constants';

/**
 * Custom hook for goal statistics and progress calculations
 * @returns {Object} Goal statistics and progress data
 */
export const useGoalStats = () => {
  const {
    mode,
    goal,
    current,
    transactions,
    pendingInterest
  } = useTrackerContext();

  /**
   * Core progress calculations (memoized)
   * @returns {Object} Progress calculation results
   */
  const progressCalculations = useMemo(() => {
    const result = CalculationService.calculateProgress(mode, current, goal);

    if (result.success) {
      return {
        success: true,
        percentage: result.data.percentage,
        remaining: result.data.remaining,
        current,
        goal
      };
    } else {
      console.error('Progress calculation error:', result.error);
      return {
        success: false,
        percentage: 0,
        remaining: goal || 0,
        current,
        goal,
        error: result.error
      };
    }
  }, [mode, current, goal]);

  /**
   * Check if goal is reached
   * @returns {Object} Goal completion status
   */
  const goalStatus = useMemo(() => {
    const result = CalculationService.isGoalReached(mode, current, goal);

    if (result.success) {
      return {
        isReached: result.data,
        isComplete: result.data,
        progress: progressCalculations.percentage
      };
    } else {
      return {
        isReached: false,
        isComplete: false,
        progress: 0,
        error: result.error
      };
    }
  }, [mode, current, goal, progressCalculations.percentage]);

  /**
   * Calculate amount needed to reach goal
   * @returns {Object} Amount needed calculation
   */
  const amountNeeded = useMemo(() => {
    const result = CalculationService.calculateAmountNeeded(mode, current, goal);

    if (result.success) {
      return {
        success: true,
        amount: result.data
      };
    } else {
      return {
        success: false,
        amount: 0,
        error: result.error
      };
    }
  }, [mode, current, goal]);

  /**
   * Calculate monthly payment needed to reach goal
   * @param {number} months - Number of months to reach goal
   * @param {number} interestRate - Annual interest rate (for debt mode)
   * @returns {Object} Monthly payment calculation
   */
  const calculateMonthlyPayment = useCallback((months, interestRate = 0) => {
    return CalculationService.calculateMonthlyPayment(mode, current, goal, months, interestRate);
  }, [mode, current, goal]);

  /**
   * Get detailed statistics for current mode
   * @returns {Object} Detailed mode-specific statistics
   */
  const detailedStats = useMemo(() => {
    const baseStats = {
      mode,
      goal,
      current,
      remaining: progressCalculations.remaining,
      percentage: progressCalculations.percentage,
      transactionCount: transactions.length
    };

    if (mode === MODES.SAVINGS) {
      return {
        ...baseStats,
        saved: current,
        stillNeeded: Math.max(goal - current, 0),
        progressLabel: 'Saved',
        remainingLabel: 'Still Needed',
        isPositiveProgress: current >= 0
      };
    } else {
      // Debt mode
      const debtPaidOff = Math.max(goal - progressCalculations.remaining, 0);
      return {
        ...baseStats,
        debtPaidOff,
        debtRemaining: progressCalculations.remaining,
        originalDebt: goal,
        totalPaid: Math.abs(current),
        progressLabel: 'Paid Off',
        remainingLabel: 'Debt Remaining',
        isPositiveProgress: debtPaidOff > 0,
        pendingInterest: pendingInterest || 0
      };
    }
  }, [mode, goal, current, progressCalculations, transactions.length, pendingInterest]);

  /**
   * Get progress milestones
   * @returns {Array} Array of milestone objects
   */
  const progressMilestones = useMemo(() => {
    const milestones = [25, 50, 75, 90, 100];
    const currentPercentage = progressCalculations.percentage;

    return milestones.map(milestone => {
      const isReached = currentPercentage >= milestone;
      const targetAmount = mode === MODES.SAVINGS
        ? (goal * milestone / 100)
        : (goal * (100 - milestone) / 100); // For debt, remaining amount

      return {
        percentage: milestone,
        isReached,
        targetAmount,
        label: `${milestone}%`,
        description: mode === MODES.SAVINGS
          ? `Save ${CalculationService.formatCurrency(targetAmount)}`
          : `Reduce debt to ${CalculationService.formatCurrency(targetAmount)}`
      };
    });
  }, [mode, goal, progressCalculations.percentage]);

  /**
   * Get trend analysis based on recent transactions
   * @param {number} recentCount - Number of recent transactions to analyze
   * @returns {Object} Trend analysis
   */
  const getTrendAnalysis = useCallback((recentCount = 5) => {
    if (transactions.length < 2) {
      return {
        trend: 'insufficient_data',
        averageTransactionAmount: 0,
        recentAverage: 0,
        message: 'Not enough data for trend analysis'
      };
    }

    const recentTransactions = transactions
      .slice(-recentCount)
      .filter(t => t.type === 'transaction'); // Exclude interest

    if (recentTransactions.length === 0) {
      return {
        trend: 'no_transactions',
        averageTransactionAmount: 0,
        recentAverage: 0,
        message: 'No recent transactions found'
      };
    }

    const allTransactionAmounts = transactions
      .filter(t => t.type === 'transaction')
      .map(t => Math.abs(t.amount));

    const recentAmounts = recentTransactions.map(t => Math.abs(t.amount));

    const overallAverage = allTransactionAmounts.reduce((sum, amount) => sum + amount, 0) / allTransactionAmounts.length;
    const recentAverage = recentAmounts.reduce((sum, amount) => sum + amount, 0) / recentAmounts.length;

    let trend = 'stable';
    let message = 'Transaction amounts are stable';

    if (recentAverage > overallAverage * 1.2) {
      trend = 'increasing';
      message = 'Recent transactions are larger than average';
    } else if (recentAverage < overallAverage * 0.8) {
      trend = 'decreasing';
      message = 'Recent transactions are smaller than average';
    }

    return {
      trend,
      averageTransactionAmount: overallAverage,
      recentAverage,
      message,
      recentCount: recentTransactions.length
    };
  }, [transactions]);

  /**
   * Calculate time to goal based on recent transaction pace
   * @returns {Object} Time to goal estimation
   */
  const timeToGoal = useMemo(() => {
    if (goalStatus.isReached) {
      return {
        timeToGoal: 0,
        estimatedDate: new Date(),
        message: 'Goal already reached!'
      };
    }

    const recentTransactions = transactions
      .slice(-6) // Last 6 transactions
      .filter(t => t.type === 'transaction');

    if (recentTransactions.length < 2) {
      return {
        timeToGoal: null,
        estimatedDate: null,
        message: 'Not enough transaction history for estimation'
      };
    }

    const averageAmount = recentTransactions.reduce((sum, t) => {
      return sum + Math.abs(t.amount);
    }, 0) / recentTransactions.length;

    if (averageAmount === 0) {
      return {
        timeToGoal: null,
        estimatedDate: null,
        message: 'Cannot estimate with zero transaction amounts'
      };
    }

    const remainingAmount = amountNeeded.amount;
    const transactionsNeeded = Math.ceil(remainingAmount / averageAmount);

    // Assume monthly transactions (adjust based on actual frequency)
    const monthsToGoal = transactionsNeeded;
    const estimatedDate = new Date();
    estimatedDate.setMonth(estimatedDate.getMonth() + monthsToGoal);

    return {
      timeToGoal: monthsToGoal,
      estimatedDate,
      transactionsNeeded,
      averageTransactionAmount: averageAmount,
      message: `Approximately ${monthsToGoal} months at current pace`
    };
  }, [goalStatus.isReached, transactions, amountNeeded.amount]);

  return {
    // Core progress data
    percentage: progressCalculations.percentage,
    remaining: progressCalculations.remaining,
    current,
    goal,

    // Goal status
    goalStatus,
    isGoalReached: goalStatus.isReached,
    amountNeeded: amountNeeded.amount,

    // Detailed statistics
    detailedStats,
    progressMilestones,
    timeToGoal,

    // Calculation functions
    calculateMonthlyPayment,
    getTrendAnalysis,

    // Formatted values
    formattedCurrent: CalculationService.formatCurrency(current),
    formattedGoal: CalculationService.formatCurrency(goal),
    formattedRemaining: CalculationService.formatCurrency(progressCalculations.remaining),
    formattedAmountNeeded: CalculationService.formatCurrency(amountNeeded.amount),

    // Progress state flags
    hasProgress: progressCalculations.percentage > 0,
    isComplete: goalStatus.isReached,
    isOnTrack: progressCalculations.percentage > 0 && !goalStatus.isReached
  };
};

export default useGoalStats;