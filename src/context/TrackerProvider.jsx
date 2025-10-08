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
import {
  calculatePendingInterest,
  shouldApplyInterest
} from '../utils/interestCalculator';

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

  // Calculate current total from transactions
  const current = useMemo(() => {
    return transactions.reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  // Calculate percentage and remaining based on mode
  const { percentage, remaining } = useMemo(() => {
    let calculatedPercentage;
    let calculatedRemaining;

    if (mode === MODES.SAVINGS) {
      // For savings: percentage of goal reached
      calculatedPercentage = Math.min((current / goal) * 100, 100);
      calculatedRemaining = goal - current;
    } else {
      // For debt: percentage of debt paid off
      // current is negative (we subtract payments), so debt remaining is goal + current
      const debtRemaining = goal + current; // current is negative, so this subtracts
      const amountPaidOff = goal - debtRemaining;
      calculatedPercentage = Math.min((amountPaidOff / goal) * 100, 100);
      calculatedRemaining = debtRemaining;
    }

    return {
      percentage: calculatedPercentage,
      remaining: calculatedRemaining
    };
  }, [mode, current, goal]);

  // Calculate and display pending interest
  useEffect(() => {
    if (mode === MODES.DEBT && remaining > 0) {
      const lastDate = lastInterestDate ||
        (transactions.length > 0 ? transactions[transactions.length - 1].date : new Date().toISOString());

      const { pendingInterest: pending, daysPending: days } = calculatePendingInterest(
        remaining, // Use remaining debt, not current
        interestRate,
        lastDate
      );

      setPendingInterest(pending);
      setDaysPending(days);
    } else {
      setPendingInterest(0);
      setDaysPending(0);
    }
  }, [current, interestRate, lastInterestDate, mode, transactions, remaining]);

  // Apply interest charge function
  const applyInterestCharge = useCallback(() => {
    if (mode !== MODES.DEBT || remaining <= 0) return;

    const lastDate = lastInterestDate ||
      (transactions.length > 0 ? transactions[transactions.length - 1].date : new Date().toISOString());

    const { pendingInterest: interest, daysPending: days } = calculatePendingInterest(
      remaining,
      interestRate,
      lastDate
    );

    if (interest > 0) {
      const interestTransaction = {
        id: Date.now(),
        amount: interest,
        date: new Date().toISOString(),
        note: LABELS.COMMON.MONTHLY_INTEREST_CHARGE,
        type: 'interest',
        days: days,
        runningTotal: current + interest,
      };

      setTransactions([...transactions, interestTransaction]);
      setLastInterestDate(new Date().toISOString());
      setPendingInterest(0);
      setDaysPending(0);
    }
  }, [current, interestRate, lastInterestDate, mode, remaining, setLastInterestDate, setPendingInterest, setDaysPending, setTransactions, transactions]);

  // Auto-apply interest on app load if 30+ days have passed
  useEffect(() => {
    if (mode === MODES.DEBT && remaining > 0) {
      const lastDate = lastInterestDate ||
        (transactions.length > 0 ? transactions[transactions.length - 1].date : null);

      if (shouldApplyInterest(lastDate, INTEREST.AUTO_APPLY_THRESHOLD_DAYS)) {
        applyInterestCharge();
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

  // Handle adding new transactions
  const handleAddTransaction = useCallback((amount, note) => {
    try {
      setError(null);
      let newTransactions = [...transactions];

      // For debt mode, add any pending interest first
      if (mode === MODES.DEBT && remaining > 0 && pendingInterest > 0) {
        const interestTransaction = {
          id: Date.now(),
          amount: pendingInterest,
          date: new Date().toISOString(),
          note: LABELS.COMMON.INTEREST_CHARGE,
          type: 'interest',
          days: daysPending,
          runningTotal: current + pendingInterest,
        };
        newTransactions.push(interestTransaction);
        setLastInterestDate(new Date().toISOString());
      }

      // Add the payment/deposit transaction
      const newRunningTotal = newTransactions.length > 0
        ? newTransactions[newTransactions.length - 1].runningTotal + (mode === MODES.DEBT ? -amount : amount)
        : current + (mode === MODES.DEBT ? -amount : amount);

      const paymentTransaction = {
        id: Date.now() + 1,
        amount: mode === MODES.DEBT ? -amount : amount,
        date: new Date().toISOString(),
        note: note,
        type: 'transaction',
        runningTotal: newRunningTotal,
      };

      newTransactions.push(paymentTransaction);
      setTransactions(newTransactions);

      // Reset pending interest after adding transaction
      if (mode === MODES.DEBT) {
        setPendingInterest(0);
        setDaysPending(0);
      }

      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Error adding transaction:', err);
      setError('Failed to add transaction. Please try again.');
    }
  }, [
    transactions, mode, remaining, pendingInterest, current, daysPending,
    setTransactions, setLastInterestDate
  ]);

  // Handle deleting transactions
  const handleDeleteTransaction = useCallback((id) => {
    if (window.confirm(LABELS.COMMON.DELETE_CONFIRMATION)) {
      try {
        setError(null);
        const updatedTransactions = transactions.filter((t) => t.id !== id);

        // Recalculate running totals
        let runningTotal = 0;
        const recalculatedTransactions = updatedTransactions.map((t) => {
          runningTotal += t.amount;
          return { ...t, runningTotal };
        });

        setTransactions(recalculatedTransactions);

        // Reset last interest date if no transactions remain
        if (recalculatedTransactions.length === 0) {
          setLastInterestDate(null);
        }

        setHasUnsavedChanges(false);
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