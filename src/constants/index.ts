/**
 * Application Constants
 *
 * Centralized constants file to eliminate magic strings and hardcoded values.
 * Provides a single source of truth for configuration values across the application.
 *
 * @fileoverview Contains all application constants organized by category
 */

/**
 * Local Storage Keys
 * All localStorage keys used throughout the application
 */
export const STORAGE_KEYS = {
  MODE: 'trackerMode',
  GOAL: 'trackerGoal',
  TRANSACTIONS: 'trackerTransactions',
  INTEREST_RATE: 'trackerInterestRate',
  LAST_INTEREST_DATE: 'trackerLastInterestDate'
};

/**
 * Default Values
 * Default values for application state and user inputs
 */
export const DEFAULTS = {
  MODE: 'savings',
  GOAL: 10000,
  INTEREST_RATE: 18.99,
  BILLING_CYCLE_DAYS: 30,
  CHART_HEIGHT: 300,
  THERMOMETER_HEIGHT: 384, // h-96 = 384px
  THERMOMETER_WIDTH: 96,   // w-24 = 96px
  DOT_RADIUS: 4
};

/**
 * Application Modes
 * Valid tracking modes for the application
 */
export const MODES = {
  SAVINGS: 'savings',
  DEBT: 'debt'
};

/**
 * Transaction Types
 * Types of transactions that can be created
 */
export const TRANSACTION_TYPES = {
  TRANSACTION: 'transaction',
  INTEREST: 'interest'
};

/**
 * Color Schemes
 * Tailwind CSS classes organized by mode and purpose
 */
export const COLORS = {
  // Mode-specific colors
  SAVINGS: {
    PRIMARY: 'bg-green-500',
    PRIMARY_HOVER: 'bg-green-600',
    TEXT: 'text-green-600',
    BACKGROUND: 'bg-green-100',
    CHART_STROKE: '#22c55e',
    CHART_DOT: '#22c55e'
  },
  DEBT: {
    PRIMARY: 'bg-red-500',
    PRIMARY_HOVER: 'bg-red-600',
    TEXT: 'text-red-600',
    BACKGROUND: 'bg-red-100',
    CHART_STROKE: '#ef4444',
    CHART_DOT: '#ef4444'
  },

  // Neutral colors
  NEUTRAL: {
    SLATE_50: 'bg-slate-50',
    SLATE_100: 'bg-slate-100',
    SLATE_200: 'bg-slate-200',
    SLATE_300: 'bg-slate-300',
    SLATE_400: 'bg-slate-400',
    SLATE_500: 'bg-slate-500',
    SLATE_600: 'bg-slate-600',
    SLATE_700: 'bg-slate-700',
    SLATE_800: 'bg-slate-800'
  },

  // Text colors
  TEXT: {
    SLATE_400: 'text-slate-400',
    SLATE_500: 'text-slate-500',
    SLATE_600: 'text-slate-600',
    SLATE_700: 'text-slate-700',
    SLATE_800: 'text-slate-800',
    RED_500: 'text-red-500',
    RED_700: 'text-red-700',
    WHITE: 'text-white'
  },

  // Hover states
  HOVER: {
    SLATE_200: 'hover:bg-slate-200',
    SLATE_400: 'hover:bg-slate-400',
    SLATE_800: 'hover:text-slate-800',
    RED_700: 'hover:text-red-700'
  }
};

/**
 * Interest Calculation Settings
 * Parameters for interest calculations and billing cycles
 */
export const INTEREST = {
  DEFAULT_RATE: DEFAULTS.INTEREST_RATE,
  BILLING_CYCLE_DAYS: DEFAULTS.BILLING_CYCLE_DAYS,
  AUTO_APPLY_THRESHOLD_DAYS: 30,
  DAYS_IN_YEAR: 365
};

/**
 * UI Text Labels
 * Common text labels used throughout the application
 */
export const LABELS = {
  MODES: {
    SAVINGS: {
      TITLE: 'Savings Goal',
      ACTION: 'Add Deposit',
      PROGRESS_LABEL: 'Saved',
      REMAINING_LABEL: 'Remaining',
      TRANSACTION_TYPE: 'Deposit'
    },
    DEBT: {
      TITLE: 'Debt Payoff',
      ACTION: 'Add Payment',
      PROGRESS_LABEL: 'Paid Off',
      REMAINING_LABEL: 'Balance',
      TRANSACTION_TYPE: 'Payment'
    }
  },
  COMMON: {
    GOAL: 'Goal',
    TRACKING_MODE: 'Tracking Mode',
    INTEREST_SETTINGS: 'Interest Settings',
    ANNUAL_INTEREST_RATE: 'Annual Interest Rate (APR)',
    FINANCIAL_PROGRESS_TRACKER: 'Financial Progress Tracker',
    TRACK_SAVINGS_DEBT: 'Track your savings goals or debt payoff',
    PROGRESS_OVER_TIME: 'Progress Over Time',
    TRANSACTION_HISTORY: 'Transaction History',
    RESET_ALL_DATA: 'Reset All Data',
    MONTHLY_INTEREST_CHARGE: 'Monthly interest charge',
    INTEREST_CHARGE: 'Interest charge',
    INTEREST_AUTO_APPLY: 'Interest will auto-apply at 30 days',
    BALANCE: 'Balance',
    DELETE_CONFIRMATION: 'Are you sure you want to delete this transaction?',
    RESET_CONFIRMATION: 'Are you sure you want to reset all data?'
  },
  TRACKER_LIST: {
    TITLE: 'My Trackers',
    EMPTY: 'No trackers yet. Create one to get started!',
    ERROR: 'Failed to load trackers.',
    RETRY: 'Try Again',
    SAVINGS: 'Savings',
    DEBT: 'Debt',
    CREATE: 'Create Tracker'
  },
  TRACKER_FORM: {
    CREATE_TITLE: 'Create New Tracker',
    NAME_LABEL: 'Tracker Name',
    NAME_PLACEHOLDER: 'e.g. Emergency Fund, Credit Card',
    GOAL_LABEL: 'Goal Amount',
    INTEREST_LABEL: 'Annual Interest Rate (%)',
    CREATE_BUTTON: 'Create Tracker',
    CANCEL: 'Cancel',
    CREATING: 'Creating...'
  },
  OFFLINE: {
    BANNER: 'You are offline. Some features may be unavailable.',
    ACTION_DISABLED: 'This action requires an internet connection.'
  },
  TRACKER_DETAIL: {
    BACK: 'Back to Trackers',
    ADD_ENTRY: 'Add Entry',
    ENTRY_AMOUNT: 'Amount',
    ENTRY_NOTE: 'Note (optional)',
    SUBMIT_ENTRY: 'Submit',
    SUBMITTING: 'Submitting...',
    ENTRY_HISTORY: 'Entry History',
    LOAD_MORE: 'Load More',
    NO_ENTRIES: 'No entries yet.',
    DELETE_TRACKER: 'Delete Tracker',
    DELETE_CONFIRM: 'Are you sure you want to delete this tracker? This cannot be undone.',
    DELETING: 'Deleting...'
  }
};

/**
 * CSS Classes
 * Commonly used CSS class combinations
 */
export const CSS_CLASSES = {
  BUTTONS: {
    PRIMARY: 'px-6 py-2 rounded-lg font-medium transition-colors',
    SECONDARY: 'flex-1 px-6 py-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 transition-colors',
    RESET: 'px-6 py-2 text-sm text-slate-600 hover:text-slate-800 underline',
    DELETE: 'text-red-500 hover:text-red-700 text-sm underline'
  },
  INPUTS: {
    PRIMARY: 'w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
    FLEX: 'flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500'
  },
  CARDS: {
    PRIMARY: 'bg-white rounded-lg shadow-md p-8 mb-6',
    SECONDARY: 'bg-slate-50 rounded-lg p-4',
    TRANSACTION: 'flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors'
  },
  CONTAINERS: {
    MAIN: 'min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8',
    CONTENT: 'max-w-2xl mx-auto',
    CENTER: 'text-center',
    HEADER: 'text-center mb-8'
  },
  TEXT: {
    TITLE: 'text-4xl font-bold text-slate-800 mb-2',
    SUBTITLE: 'text-slate-600',
    SECTION_TITLE: 'text-lg font-semibold text-slate-700 mb-4',
    SECTION_TITLE_FLEX: 'w-full flex items-center justify-between text-lg font-semibold text-slate-700 mb-4',
    LABEL: 'text-sm text-slate-600 mb-1',
    VALUE: 'text-2xl font-bold text-slate-800',
    SMALL_TEXT: 'text-xs text-slate-500 mt-1',
    MEDIUM_TEXT: 'text-sm text-slate-500',
    TRANSACTION_AMOUNT: 'font-medium text-slate-800',
    TRANSACTION_NOTE: 'text-sm text-slate-600 italic',
    TRANSACTION_BALANCE: 'font-medium text-slate-700'
  }
};

/**
 * Utility function to get mode-specific colors
 * @param {string} mode - The current mode ('savings' or 'debt')
 * @returns {object} Color scheme object for the mode
 */
export const getModeColors = (mode) => {
  return mode === MODES.SAVINGS ? COLORS.SAVINGS : COLORS.DEBT;
};

/**
 * Utility function to get mode-specific labels
 * @param {string} mode - The current mode ('savings' or 'debt')
 * @returns {object} Labels object for the mode
 */
export const getModeLabels = (mode) => {
  return mode === MODES.SAVINGS ? LABELS.MODES.SAVINGS : LABELS.MODES.DEBT;
};