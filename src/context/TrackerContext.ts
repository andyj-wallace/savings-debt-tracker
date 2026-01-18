/**
 * TrackerContext
 *
 * React Context for global state management in the Financial Tracker application.
 * Provides centralized state for mode, goal, transactions, interest settings, and
 * related operations to eliminate prop drilling throughout the component tree.
 *
 * @fileoverview Main application context definition
 */

import { createContext, useContext } from 'react';

/**
 * Initial context state structure
 * Defines the shape of the context value object
 */
export const initialTrackerState = {
  // Core tracking data
  mode: 'savings',
  goal: 10000,
  transactions: [],
  interestRate: 18.99,
  lastInterestDate: null,

  // Derived/computed state
  current: 0,
  remaining: 0,
  percentage: 0,
  pendingInterest: 0,
  daysPending: 0,

  // State update functions
  setMode: (_mode: string) => {},
  setGoal: (_goal: number) => {},
  setTransactions: (_transactions: unknown[]) => {},
  setInterestRate: (_rate: number) => {},
  setLastInterestDate: (_date: string | null) => {},

  // Additional state setters
  setPendingInterest: (_interest: number) => {},
  setDaysPending: (_days: number) => {},
  setError: (_error: string | null) => {},
  setHasUnsavedChanges: (_hasChanges: boolean) => {},

  // Business logic functions
  handleModeChange: (_newMode: string) => {},
  handleAddTransaction: (_amount: number, _note: string) => {},
  handleDeleteTransaction: (_id: number) => {},
  handleReset: () => {},
  applyInterestCharge: () => {},
  setIsLoading: (_loading: boolean) => {},

  // Utility flags
  isLoading: false,
  error: null as string | null,
  hasUnsavedChanges: false
};

/**
 * Create the TrackerContext
 * Uses the initial state as the default value
 */
export const TrackerContext = createContext(initialTrackerState);

/**
 * Custom hook to use the TrackerContext
 * Provides error checking to ensure context is used within a provider
 *
 * @returns {Object} The current context value
 * @throws {Error} If used outside of TrackerProvider
 */
export const useTrackerContext = () => {
  const context = useContext(TrackerContext);

  if (context === undefined) {
    throw new Error(
      'useTrackerContext must be used within a TrackerProvider. ' +
      'Make sure your component is wrapped in a TrackerProvider component.'
    );
  }

  return context;
};

/**
 * Type-safe hook variants for specific context slices
 * These hooks provide access to specific parts of the context
 * to minimize re-renders when only certain values change
 */

/**
 * Hook to access mode-related state and functions
 * @returns {Object} Mode state and handlers
 */
export const useTrackerMode = () => {
  const { mode, setMode, handleModeChange } = useTrackerContext();
  return { mode, setMode, handleModeChange };
};

/**
 * Hook to access goal-related state and functions
 * @returns {Object} Goal state and handlers
 */
export const useTrackerGoal = () => {
  const { goal, setGoal, mode } = useTrackerContext();
  return { goal, setGoal, mode };
};

/**
 * Hook to access transactions-related state and functions
 * @returns {Object} Transactions state and handlers
 */
export const useTrackerTransactions = () => {
  const {
    transactions,
    setTransactions,
    handleAddTransaction,
    handleDeleteTransaction,
    current,
    mode
  } = useTrackerContext();

  return {
    transactions,
    setTransactions,
    handleAddTransaction,
    handleDeleteTransaction,
    current,
    mode
  };
};

/**
 * Hook to access interest-related state and functions
 * @returns {Object} Interest state and handlers
 */
export const useTrackerInterest = () => {
  const {
    interestRate,
    setInterestRate,
    lastInterestDate,
    setLastInterestDate,
    pendingInterest,
    daysPending,
    applyInterestCharge,
    mode
  } = useTrackerContext();

  return {
    interestRate,
    setInterestRate,
    lastInterestDate,
    setLastInterestDate,
    pendingInterest,
    daysPending,
    applyInterestCharge,
    mode
  };
};

/**
 * Hook to access calculated/derived state
 * @returns {Object} Calculated values
 */
export const useTrackerCalculations = () => {
  const {
    current,
    remaining,
    percentage,
    pendingInterest,
    daysPending,
    mode,
    goal
  } = useTrackerContext();

  return {
    current,
    remaining,
    percentage,
    pendingInterest,
    daysPending,
    mode,
    goal
  };
};

/**
 * Hook to access utility state (loading, errors, etc.)
 * @returns {Object} Utility state
 */
export const useTrackerUtility = () => {
  const {
    isLoading,
    error,
    hasUnsavedChanges,
    handleReset
  } = useTrackerContext();

  return {
    isLoading,
    error,
    hasUnsavedChanges,
    handleReset
  };
};

/**
 * Context display name for React DevTools
 */
TrackerContext.displayName = 'TrackerContext';

export default TrackerContext;