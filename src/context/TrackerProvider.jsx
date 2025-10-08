/**
 * TrackerProvider
 *
 * Context provider component that manages all global state for the Financial Tracker
 * application. Centralizes state management, business logic, and provides optimized
 * context value to eliminate prop drilling throughout the component tree.
 *
 * @fileoverview Main application context provider implementation
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { TrackerContext } from './TrackerContext';
import {
  STORAGE_KEYS,
  DEFAULTS,
  MODES,
  INTEREST,
  LABELS
} from '../constants';
import TransactionService from '../services/TransactionService';
import InterestService from '../services/InterestService';
import CalculationService from '../services/CalculationService';

/**
 * TrackerProvider Component
 * Wraps the application with global state management
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} Provider component
 */
export const TrackerProvider = ({ children }) => {
  // Persistent state using localStorage
  const [mode, setMode] = useLocalStorage(STORAGE_KEYS.MODE, DEFAULTS.MODE);
  const [goal, setGoal] = useLocalStorage(STORAGE_KEYS.GOAL, DEFAULTS.GOAL);
  const [transactionsRaw, setTransactions] = useLocalStorage(STORAGE_KEYS.TRANSACTIONS, []);
  const [interestRate, setInterestRate] = useLocalStorage(STORAGE_KEYS.INTEREST_RATE, DEFAULTS.INTEREST_RATE);
  const [lastInterestDate, setLastInterestDate] = useLocalStorage(STORAGE_KEYS.LAST_INTEREST_DATE, null);

  // Local state for calculated values
  const [pendingInterest, setPendingInterest] = useState(0);
  const [daysPending, setDaysPending] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Ensure transactions is always an array
  const transactions = useMemo(() => {
    return Array.isArray(transactionsRaw) ? transactionsRaw : [];
  }, [transactionsRaw]);

  // Calculate current total from transactions using CalculationService
  const current = useMemo(() => {
    const result = CalculationService.calculateTotalFromTransactions(transactions);
    return result.success ? result.data : 0;
  }, [transactions]);

  // Calculate percentage and remaining based on mode using CalculationService
  const { percentage, remaining } = useMemo(() => {
    const result = CalculationService.calculateProgress(mode, current, goal);

    if (result.success) {
      return result.data;
    } else {
      console.error('Progress calculation error:', result.error);
      // Fallback to default values
      return {
        percentage: 0,
        remaining: goal || 0
      };
    }
  }, [mode, current, goal]);

  // Calculate and display pending interest using InterestService
  useEffect(() => {
    const result = InterestService.updatePendingInterest(
      mode,
      remaining,
      interestRate,
      lastInterestDate,
      transactions
    );

    if (result.success) {
      setPendingInterest(result.data.pendingInterest);
      setDaysPending(result.data.daysPending);
    } else {
      console.error('Pending interest calculation error:', result.error);
      setPendingInterest(0);
      setDaysPending(0);
    }
  }, [current, interestRate, lastInterestDate, mode, transactions, remaining]);

  // Apply interest charge function using InterestService
  const applyInterestCharge = useCallback(() => {
    if (mode !== MODES.DEBT || remaining <= 0) return;

    try {
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
      } else if (!result.success) {
        console.error('Apply interest charge error:', result.error);
        setError('Failed to apply interest charge. Please try again.');
      }
    } catch (err) {
      console.error('Apply interest charge error:', err);
      setError('Failed to apply interest charge. Please try again.');
    }
  }, [current, interestRate, lastInterestDate, mode, remaining, setLastInterestDate, setTransactions, transactions]);

  // Auto-apply interest on app load if 30+ days have passed
  useEffect(() => {
    if (mode === MODES.DEBT && remaining > 0) {
      const lastDate = lastInterestDate ||
        (transactions.length > 0 ? transactions[transactions.length - 1].date : null);

      const shouldApplyResult = InterestService.shouldAutoApplyInterest(lastDate, INTEREST.AUTO_APPLY_THRESHOLD_DAYS);

      if (shouldApplyResult.success && shouldApplyResult.data) {
        applyInterestCharge();
      } else if (!shouldApplyResult.success) {
        console.error('Auto-apply interest check error:', shouldApplyResult.error);
      }
    }
  }, [applyInterestCharge, lastInterestDate, mode, remaining, transactions]);

  // Handle mode change with state reset
  const handleModeChange = useCallback((newMode) => {
    setMode(newMode);
    setTransactions([]);
    setGoal(DEFAULTS.GOAL);
    setLastInterestDate(null);
    setError(null);
    setHasUnsavedChanges(false);
  }, [setMode, setTransactions, setGoal, setLastInterestDate]);

  // Handle adding new transactions using TransactionService
  const handleAddTransaction = useCallback((amount, note) => {
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

      if (result.success) {
        setTransactions(result.data.transactions);

        // Update last interest date if interest was added
        if (result.data.addedInterest) {
          setLastInterestDate(new Date().toISOString());
        }

        // Reset pending interest after adding transaction
        if (mode === MODES.DEBT) {
          setPendingInterest(0);
          setDaysPending(0);
        }

        setHasUnsavedChanges(false);
      } else {
        console.error('Add transaction error:', result.error);
        setError(result.error || 'Failed to add transaction. Please try again.');
      }
    } catch (err) {
      console.error('Error adding transaction:', err);
      setError('Failed to add transaction. Please try again.');
    }
  }, [
    transactions, mode, remaining, pendingInterest, current, daysPending,
    setTransactions, setLastInterestDate
  ]);

  // Handle deleting transactions using TransactionService
  const handleDeleteTransaction = useCallback((id) => {
    if (window.confirm(LABELS.COMMON.DELETE_CONFIRMATION)) {
      try {
        setError(null);

        const result = TransactionService.deleteTransaction(transactions, id);

        if (result.success) {
          setTransactions(result.data.transactions);

          // Reset last interest date if no transactions remain
          if (result.data.shouldResetInterestDate) {
            setLastInterestDate(null);
          }

          setHasUnsavedChanges(false);
        } else {
          console.error('Delete transaction error:', result.error);
          setError(result.error || 'Failed to delete transaction. Please try again.');
        }
      } catch (err) {
        console.error('Error deleting transaction:', err);
        setError('Failed to delete transaction. Please try again.');
      }
    }
  }, [transactions, setTransactions, setLastInterestDate]);

  // Handle resetting all data
  const handleReset = useCallback(() => {
    if (window.confirm(LABELS.COMMON.RESET_CONFIRMATION)) {
      try {
        setError(null);

        // Clear localStorage
        localStorage.removeItem(STORAGE_KEYS.MODE);
        localStorage.removeItem(STORAGE_KEYS.GOAL);
        localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
        localStorage.removeItem(STORAGE_KEYS.INTEREST_RATE);
        localStorage.removeItem(STORAGE_KEYS.LAST_INTEREST_DATE);

        // Reset state
        setMode(DEFAULTS.MODE);
        setGoal(DEFAULTS.GOAL);
        setTransactions([]);
        setInterestRate(DEFAULTS.INTEREST_RATE);
        setLastInterestDate(null);
        setPendingInterest(0);
        setDaysPending(0);
        setHasUnsavedChanges(false);
      } catch (err) {
        console.error('Error resetting data:', err);
        setError('Failed to reset data. Please try again.');
      }
    }
  }, [setMode, setGoal, setTransactions, setInterestRate, setLastInterestDate]);

  // Memoized context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    // Core tracking data
    mode,
    goal,
    transactions,
    interestRate,
    lastInterestDate,

    // Derived/computed state
    current,
    remaining,
    percentage,
    pendingInterest,
    daysPending,

    // State update functions
    setMode,
    setGoal,
    setTransactions,
    setInterestRate,
    setLastInterestDate,

    // Business logic functions
    handleModeChange,
    handleAddTransaction,
    handleDeleteTransaction,
    handleReset,
    applyInterestCharge,

    // Utility flags
    isLoading,
    error,
    hasUnsavedChanges,

    // Utility functions
    setError,
    setIsLoading,
    setHasUnsavedChanges
  }), [
    // Core state
    mode, goal, transactions, interestRate, lastInterestDate,
    // Computed state
    current, remaining, percentage, pendingInterest, daysPending,
    // Setters
    setMode, setGoal, setTransactions, setInterestRate, setLastInterestDate,
    // Handlers
    handleModeChange, handleAddTransaction, handleDeleteTransaction, handleReset, applyInterestCharge,
    // Utility state
    isLoading, error, hasUnsavedChanges
  ]);

  return (
    <TrackerContext.Provider value={contextValue}>
      {children}
    </TrackerContext.Provider>
  );
};

export default TrackerProvider;