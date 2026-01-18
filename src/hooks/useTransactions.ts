/**
 * useTransactions Hook
 *
 * Custom hook that encapsulates transaction management operations.
 * Provides a clean API for adding, deleting, and managing transactions
 * by composing the TrackerContext with TransactionService.
 *
 * @fileoverview Transaction management custom hook
 */

import { useCallback, useMemo } from 'react';
import { useTrackerContext } from '../context/TrackerContext';
import TransactionService from '../services/TransactionService';

/**
 * Custom hook for transaction operations
 * @returns {Object} Transaction operations and state
 */
export const useTransactions = () => {
  const {
    transactions,
    setTransactions,
    mode,
    pendingInterest,
    daysPending,
    current,
    remaining,
    setLastInterestDate,
    setPendingInterest,
    setDaysPending,
    setError,
    setHasUnsavedChanges
  } = useTrackerContext();

  /**
   * Add a new transaction
   * @param {number} amount - Transaction amount
   * @param {string} note - Transaction note/description
   * @returns {Promise<Object>} Result object with success/error
   */
  const addTransaction = useCallback(async (amount, note) => {
    try {
      setError(null);

      const result = TransactionService.addTransaction(
        transactions,
        amount,
        note,
        mode,
        pendingInterest,
        daysPending,
        current,
        remaining
      );

      if (result.success && result.data) {
        const data = result.data as { transactions: unknown[]; addedInterest: boolean };
        setTransactions(data.transactions);

        // Update last interest date if interest was added
        if (data.addedInterest) {
          setLastInterestDate(new Date().toISOString());
        }

        // Reset pending interest after adding transaction (for debt mode)
        if (mode === 'debt') {
          setPendingInterest(0);
          setDaysPending(0);
        }

        setHasUnsavedChanges(false);

        return {
          success: true,
          data: {
            transactionAdded: true,
            interestAdded: data.addedInterest,
            newTransactions: data.transactions
          }
        };
      } else {
        const errorMsg = 'error' in result ? result.error : 'Failed to add transaction. Please try again.';
        setError(errorMsg || 'Failed to add transaction. Please try again.');
        return {
          success: false,
          error: errorMsg
        };
      }
    } catch (err) {
      console.error('useTransactions.addTransaction error:', err);
      const errorMessage = 'Failed to add transaction. Please try again.';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    }
  }, [
    transactions, mode, pendingInterest, daysPending, current, remaining,
    setTransactions, setLastInterestDate, setPendingInterest, setDaysPending,
    setError, setHasUnsavedChanges
  ]);

  /**
   * Delete a transaction
   * @param {number|string} transactionId - ID of transaction to delete
   * @returns {Promise<Object>} Result object with success/error
   */
  const deleteTransaction = useCallback(async (transactionId) => {
    try {
      setError(null);

      const result = TransactionService.deleteTransaction(transactions, transactionId);

      if (result.success) {
        setTransactions(result.data.transactions);

        // Reset last interest date if no transactions remain
        if (result.data.shouldResetInterestDate) {
          setLastInterestDate(null);
        }

        setHasUnsavedChanges(false);

        return {
          success: true,
          data: {
            transactionDeleted: true,
            interestDateReset: result.data.shouldResetInterestDate,
            newTransactions: result.data.transactions
          }
        };
      } else {
        setError(result.error || 'Failed to delete transaction. Please try again.');
        return {
          success: false,
          error: result.error
        };
      }
    } catch (err) {
      console.error('useTransactions.deleteTransaction error:', err);
      const errorMessage = 'Failed to delete transaction. Please try again.';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    }
  }, [transactions, setTransactions, setLastInterestDate, setError, setHasUnsavedChanges]);

  /**
   * Get transaction statistics
   * @returns {Object} Transaction statistics
   */
  const transactionStats = useMemo(() => {
    const totalResult = TransactionService.calculateCurrentTotal(transactions);
    const validationResult = TransactionService.validateTransactions(transactions);
    const lastTransactionDate = TransactionService.getLastTransactionDate(transactions);

    return {
      total: totalResult,
      count: transactions.length,
      isValid: validationResult.isValid,
      validationError: validationResult.isValid ? null : validationResult.error,
      lastTransactionDate,
      hasTransactions: transactions.length > 0
    };
  }, [transactions]);

  /**
   * Get transactions filtered by type
   * @param {string} type - Transaction type to filter by
   * @returns {Array} Filtered transactions
   */
  const getTransactionsByType = useCallback((type) => {
    return transactions.filter(transaction => transaction.type === type);
  }, [transactions]);

  /**
   * Get recent transactions
   * @param {number} count - Number of recent transactions to return
   * @returns {Array} Recent transactions
   */
  const getRecentTransactions = useCallback((count = 5) => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, count);
  }, [transactions]);

  /**
   * Check if a transaction can be deleted
   * @param {number|string} transactionId - Transaction ID to check
   * @returns {boolean} Whether transaction can be deleted
   */
  const canDeleteTransaction = useCallback((transactionId) => {
    return transactions.some(t => t.id === transactionId);
  }, [transactions]);

  /**
   * Recalculate all running totals
   * @returns {Promise<Object>} Result with updated transactions
   */
  const recalculateRunningTotals = useCallback(async () => {
    try {
      const recalculatedTransactions = TransactionService.recalculateRunningTotals(transactions);
      setTransactions(recalculatedTransactions);
      setHasUnsavedChanges(false);

      return {
        success: true,
        data: recalculatedTransactions
      };
    } catch (err) {
      console.error('useTransactions.recalculateRunningTotals error:', err);
      const errorMessage = 'Failed to recalculate totals. Please try again.';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    }
  }, [transactions, setTransactions, setError, setHasUnsavedChanges]);

  return {
    // Transaction data
    transactions,
    transactionStats,

    // Transaction operations
    addTransaction,
    deleteTransaction,
    recalculateRunningTotals,

    // Transaction queries
    getTransactionsByType,
    getRecentTransactions,
    canDeleteTransaction,

    // Transaction state
    hasTransactions: transactions.length > 0,
    transactionCount: transactions.length,
    isValid: transactionStats.isValid
  };
};

export default useTransactions;