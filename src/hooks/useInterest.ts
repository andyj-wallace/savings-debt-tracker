/**
 * useInterest Hook
 *
 * Custom hook that encapsulates interest calculation and management operations.
 * Provides real-time pending interest calculation, manual interest application,
 * and auto-application checking by composing TrackerContext with InterestService.
 *
 * @fileoverview Interest management custom hook
 */

import { useCallback, useMemo } from 'react';
import { useTrackerContext } from '../context/TrackerContext';
import InterestService from '../services/InterestService';
import { MODES, INTEREST } from '../constants';

/**
 * Custom hook for interest operations
 * @returns {Object} Interest operations and state
 */
export const useInterest = () => {
  const {
    mode,
    remaining,
    interestRate,
    lastInterestDate,
    transactions,
    current,
    pendingInterest,
    daysPending,
    setTransactions,
    setLastInterestDate,
    setPendingInterest,
    setDaysPending,
    setError
  } = useTrackerContext();

  /**
   * Check if interest functionality is applicable
   * @returns {boolean} Whether interest is applicable for current mode
   */
  const isInterestApplicable = useMemo(() => {
    return mode === MODES.DEBT && remaining > 0;
  }, [mode, remaining]);

  /**
   * Calculate current pending interest
   * @returns {Object} Pending interest calculation result
   */
  const currentPendingInterest = useMemo(() => {
    if (!isInterestApplicable) {
      return {
        success: true,
        data: { pendingInterest: 0, daysPending: 0 }
      };
    }

    return InterestService.updatePendingInterest(
      mode,
      remaining,
      interestRate,
      lastInterestDate,
      transactions
    );
  }, [mode, remaining, interestRate, lastInterestDate, transactions, isInterestApplicable]);

  /**
   * Apply interest charge manually
   * @returns {Promise<Object>} Result object with success/error
   */
  const applyInterestCharge = useCallback(async () => {
    try {
      if (!isInterestApplicable) {
        return {
          success: false,
          error: 'Interest not applicable for current mode or zero balance'
        };
      }

      setError(null);

      const lastDate = lastInterestDate ||
        (transactions.length > 0 ? transactions[transactions.length - 1].date : new Date().toISOString());

      const result = InterestService.applyInterestCharge(
        remaining,
        interestRate,
        lastDate,
        current
      );

      if (result.success && result.data.interestApplied) {
        setTransactions([...transactions, result.data.transaction]);
        setLastInterestDate(result.data.newInterestDate);
        setPendingInterest(0);
        setDaysPending(0);

        return {
          success: true,
          data: {
            interestApplied: true,
            amount: result.data.amount,
            days: result.data.days,
            transaction: result.data.transaction
          }
        };
      } else if (result.success && !result.data.interestApplied) {
        return {
          success: true,
          data: {
            interestApplied: false,
            message: 'No pending interest to apply'
          }
        };
      } else {
        setError(result.error || 'Failed to apply interest charge. Please try again.');
        return {
          success: false,
          error: result.error
        };
      }
    } catch (err) {
      console.error('useInterest.applyInterestCharge error:', err);
      const errorMessage = 'Failed to apply interest charge. Please try again.';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    }
  }, [
    isInterestApplicable, remaining, interestRate, lastInterestDate, current, transactions,
    setTransactions, setLastInterestDate, setPendingInterest, setDaysPending, setError
  ]);

  /**
   * Check if interest should be auto-applied
   * @param {number} thresholdDays - Days threshold for auto-application
   * @returns {Object} Auto-apply check result
   */
  const shouldAutoApplyInterest = useCallback((thresholdDays = INTEREST.AUTO_APPLY_THRESHOLD_DAYS) => {
    if (!isInterestApplicable) {
      return {
        success: true,
        data: false
      };
    }

    const lastDate = lastInterestDate ||
      (transactions.length > 0 ? transactions[transactions.length - 1].date : null);

    return InterestService.shouldAutoApplyInterest(lastDate, thresholdDays);
  }, [isInterestApplicable, lastInterestDate, transactions]);

  /**
   * Get interest rate information
   * @returns {Object} Interest rate details
   */
  const interestRateInfo = useMemo(() => {
    const validation = InterestService.validateRate(interestRate);
    const dailyRate = InterestService.getDailyRate(interestRate);

    return {
      annualRate: interestRate,
      dailyRate,
      isValid: validation.isValid,
      validationError: validation.isValid ? null : validation.error
    };
  }, [interestRate]);

  /**
   * Calculate interest for a specific period
   * @param {number} balance - Balance to calculate interest on
   * @param {number} days - Number of days
   * @param {number} rate - Annual interest rate (optional, defaults to current rate)
   * @returns {Object} Interest calculation result
   */
  const calculateInterestForPeriod = useCallback((balance, days, rate = null) => {
    const effectiveRate = rate || interestRate;
    const dailyRate = effectiveRate / 100 / 365;
    const interestAmount = balance * dailyRate * days;

    return {
      success: true,
      data: {
        interestAmount,
        dailyRate: effectiveRate / 365,
        annualRate: effectiveRate,
        days,
        balance
      }
    };
  }, [interestRate]);

  /**
   * Reset pending interest (useful when transactions are added)
   * @returns {Promise<void>}
   */
  const resetPendingInterest = useCallback(async () => {
    setPendingInterest(0);
    setDaysPending(0);
  }, [setPendingInterest, setDaysPending]);

  /**
   * Get interest history from transactions
   * @returns {Array} Interest transactions
   */
  const getInterestHistory = useCallback(() => {
    return transactions.filter(transaction => transaction.type === 'interest');
  }, [transactions]);

  /**
   * Calculate total interest charged
   * @returns {number} Total interest amount
   */
  const totalInterestCharged = useMemo(() => {
    return getInterestHistory().reduce((total, transaction) => {
      return total + Math.abs(transaction.amount);
    }, 0);
  }, [getInterestHistory]);

  /**
   * Get next suggested interest application date
   * @returns {Date|null} Next suggested date or null
   */
  const nextInterestDate = useMemo(() => {
    if (!isInterestApplicable || !lastInterestDate) {
      return null;
    }

    const lastDate = new Date(lastInterestDate);
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + 30); // Monthly interest
    return nextDate;
  }, [isInterestApplicable, lastInterestDate]);

  return {
    // Interest state
    isInterestApplicable,
    pendingInterest,
    daysPending,
    interestRate,
    lastInterestDate,

    // Interest calculations
    currentPendingInterest: currentPendingInterest.success ? currentPendingInterest.data : { pendingInterest: 0, daysPending: 0 },
    interestRateInfo,
    totalInterestCharged,
    nextInterestDate,

    // Interest operations
    applyInterestCharge,
    resetPendingInterest,
    calculateInterestForPeriod,

    // Interest queries
    shouldAutoApplyInterest,
    getInterestHistory,

    // Interest state flags
    hasPendingInterest: pendingInterest > 0,
    canApplyInterest: isInterestApplicable && pendingInterest > 0,
    interestOverdue: daysPending >= INTEREST.AUTO_APPLY_THRESHOLD_DAYS
  };
};

export default useInterest;