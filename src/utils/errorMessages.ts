/**
 * Error Messages Utility
 *
 * Centralized error message templates and formatting functions
 * for consistent user-friendly error communication throughout
 * the application.
 *
 * @fileoverview Error message templates and formatting utilities
 */

/**
 * Error message templates organized by category
 */
export const ERROR_MESSAGES = {
  // General validation errors
  REQUIRED: (fieldName) => `${fieldName} is required`,
  INVALID_NUMBER: (fieldName) => `${fieldName} must be a valid number`,
  NEGATIVE_VALUE: (fieldName) => `${fieldName} cannot be negative`,
  ZERO_VALUE: (fieldName) => `${fieldName} must be greater than zero`,

  // Range validation errors
  MIN_VALUE: (fieldName, min) => `${fieldName} must be at least ${min}`,
  MAX_VALUE: (fieldName, max) => `${fieldName} cannot exceed ${max}`,
  OUT_OF_RANGE: (fieldName, min, max) => `${fieldName} must be between ${min} and ${max}`,

  // String/text validation errors
  TOO_SHORT: (fieldName, minLength) => `${fieldName} must be at least ${minLength} character${minLength === 1 ? '' : 's'}`,
  TOO_LONG: (fieldName, maxLength) => `${fieldName} cannot exceed ${maxLength} character${maxLength === 1 ? '' : 's'}`,
  EMPTY_FIELD: (fieldName) => `${fieldName} cannot be empty`,

  // Financial specific errors
  CURRENCY: {
    INVALID_AMOUNT: 'Please enter a valid dollar amount',
    TOO_SMALL: 'Amount must be at least $0.01',
    TOO_LARGE: 'Amount cannot exceed $999,999,999',
    NEGATIVE_AMOUNT: 'Amount cannot be negative',
    ZERO_AMOUNT: 'Amount must be greater than zero'
  },

  GOAL: {
    INVALID: 'Please enter a valid goal amount',
    TOO_SMALL: 'Goal must be at least $1',
    TOO_LARGE: 'Goal cannot exceed $999,999,999',
    NEGATIVE: 'Goal cannot be negative'
  },

  INTEREST: {
    INVALID_RATE: 'Please enter a valid interest rate',
    NEGATIVE_RATE: 'Interest rate cannot be negative',
    TOO_HIGH: 'Interest rate cannot exceed 99.99%',
    INVALID_PERCENTAGE: 'Interest rate must be a valid percentage'
  },

  TRANSACTION: {
    INVALID_DATA: 'Invalid transaction data',
    MISSING_AMOUNT: 'Transaction amount is required',
    INVALID_AMOUNT: 'Transaction amount must be a valid number',
    NOTE_TOO_LONG: 'Transaction note cannot exceed 200 characters'
  },

  // System/storage errors
  STORAGE: {
    QUOTA_EXCEEDED: 'Storage quota exceeded. Please clear some data or use a different browser.',
    SAVE_FAILED: 'Failed to save data. Please try again.',
    LOAD_FAILED: 'Failed to load saved data.',
    PERMISSION_DENIED: 'Storage permission denied. Please check browser settings.'
  },

  // Network/API errors (for future use)
  NETWORK: {
    CONNECTION_FAILED: 'Connection failed. Please check your internet connection.',
    TIMEOUT: 'Request timed out. Please try again.',
    SERVER_ERROR: 'Server error. Please try again later.',
    UNAUTHORIZED: 'You are not authorized to perform this action.'
  }
};

/**
 * Error severity levels for styling and handling
 */
export const ERROR_SEVERITY = {
  LOW: 'low',       // Minor validation errors, user can continue
  MEDIUM: 'medium', // Important validation errors, should be fixed
  HIGH: 'high',     // Critical errors, blocks functionality
  CRITICAL: 'critical' // System errors, may require app restart
};

/**
 * Default severity mappings for different error types
 */
export const ERROR_SEVERITY_MAP = {
  validation: ERROR_SEVERITY.MEDIUM,
  storage: ERROR_SEVERITY.HIGH,
  network: ERROR_SEVERITY.HIGH,
  system: ERROR_SEVERITY.CRITICAL
};

/**
 * Format currency values for error messages
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
export const formatCurrencyForError = (amount) => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '$0.00';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Format percentage values for error messages
 * @param {number} percentage - Percentage to format
 * @returns {string} Formatted percentage string
 */
export const formatPercentageForError = (percentage) => {
  if (typeof percentage !== 'number' || isNaN(percentage)) {
    return '0.00%';
  }

  return `${percentage.toFixed(2)}%`;
};

/**
 * Get user-friendly field name for error messages
 * @param {string} fieldName - Internal field name
 * @param {string} mode - Current app mode ('savings' or 'debt')
 * @returns {string} User-friendly field name
 */
export const getFriendlyFieldName = (fieldName, mode = null) => {
  const fieldNameMap = {
    // Generic fields
    amount: mode === 'savings' ? 'Deposit amount' : 'Payment amount',
    goal: mode === 'savings' ? 'Savings goal' : 'Total debt',
    interestRate: 'Interest rate',
    note: 'Note',

    // Specific fields
    deposit: 'Deposit amount',
    payment: 'Payment amount',
    savingsGoal: 'Savings goal',
    debtAmount: 'Debt amount',
    annualRate: 'Annual interest rate',
    transactionNote: 'Transaction note',

    // System fields
    mode: 'Tracking mode',
    transactions: 'Transaction history',
    balance: 'Balance'
  };

  return fieldNameMap[fieldName] || fieldName;
};

/**
 * Create a structured error object
 * @param {string} message - Error message
 * @param {string} field - Field that caused the error
 * @param {string} severity - Error severity level
 * @param {string} code - Error code for programmatic handling
 * @returns {Object} Structured error object
 */
export const createError = (message, field = null, severity = ERROR_SEVERITY.MEDIUM, code = null) => {
  return {
    message,
    field,
    severity,
    code,
    timestamp: new Date().toISOString()
  };
};

/**
 * Validation error builders for common scenarios
 */
export const validationErrors = {
  /**
   * Create required field error
   * @param {string} fieldName - Name of the required field
   * @returns {Object} Error object
   */
  required: (fieldName) => createError(
    ERROR_MESSAGES.REQUIRED(fieldName),
    fieldName,
    ERROR_SEVERITY.MEDIUM,
    'FIELD_REQUIRED'
  ),

  /**
   * Create invalid number error
   * @param {string} fieldName - Name of the field
   * @returns {Object} Error object
   */
  invalidNumber: (fieldName) => createError(
    ERROR_MESSAGES.INVALID_NUMBER(fieldName),
    fieldName,
    ERROR_SEVERITY.MEDIUM,
    'INVALID_NUMBER'
  ),

  /**
   * Create range error
   * @param {string} fieldName - Name of the field
   * @param {number} min - Minimum allowed value
   * @param {number} max - Maximum allowed value
   * @returns {Object} Error object
   */
  outOfRange: (fieldName, min, max) => createError(
    ERROR_MESSAGES.OUT_OF_RANGE(fieldName, min, max),
    fieldName,
    ERROR_SEVERITY.MEDIUM,
    'OUT_OF_RANGE'
  ),

  /**
   * Create negative value error
   * @param {string} fieldName - Name of the field
   * @returns {Object} Error object
   */
  negativeValue: (fieldName) => createError(
    ERROR_MESSAGES.NEGATIVE_VALUE(fieldName),
    fieldName,
    ERROR_SEVERITY.MEDIUM,
    'NEGATIVE_VALUE'
  ),

  /**
   * Create zero value error
   * @param {string} fieldName - Name of the field
   * @returns {Object} Error object
   */
  zeroValue: (fieldName) => createError(
    ERROR_MESSAGES.ZERO_VALUE(fieldName),
    fieldName,
    ERROR_SEVERITY.MEDIUM,
    'ZERO_VALUE'
  )
};

/**
 * Get error message with proper formatting based on error type
 * @param {string} errorType - Type of error
 * @param {Object} context - Context information for the error
 * @returns {string} Formatted error message
 */
interface ErrorContext {
  fieldName?: string;
  value?: unknown;
  min?: number;
  max?: number;
  mode?: string;
}

export const getFormattedErrorMessage = (errorType: string, context: ErrorContext = {}) => {
  const { fieldName, value, min, max, mode } = context;
  const friendlyFieldName = getFriendlyFieldName(fieldName, mode);

  switch (errorType) {
    case 'REQUIRED':
      return ERROR_MESSAGES.REQUIRED(friendlyFieldName);

    case 'INVALID_NUMBER':
      return ERROR_MESSAGES.INVALID_NUMBER(friendlyFieldName);

    case 'NEGATIVE_VALUE':
      return ERROR_MESSAGES.NEGATIVE_VALUE(friendlyFieldName);

    case 'ZERO_VALUE':
      return ERROR_MESSAGES.ZERO_VALUE(friendlyFieldName);

    case 'MIN_VALUE':
      const formattedMin = typeof min === 'number' && fieldName?.includes('amount')
        ? formatCurrencyForError(min)
        : min;
      return ERROR_MESSAGES.MIN_VALUE(friendlyFieldName, formattedMin);

    case 'MAX_VALUE':
      const formattedMax = typeof max === 'number' && fieldName?.includes('amount')
        ? formatCurrencyForError(max)
        : max;
      return ERROR_MESSAGES.MAX_VALUE(friendlyFieldName, formattedMax);

    case 'TOO_LONG':
      return ERROR_MESSAGES.TOO_LONG(friendlyFieldName, max);

    default:
      return 'Invalid input. Please check your entry and try again.';
  }
};

/**
 * Error message helpers for specific use cases
 */
export const errorHelpers = {
  /**
   * Get error message for currency validation
   * @param {string} errorType - Type of currency error
   * @param {number} value - The invalid value
   * @returns {string} Currency-specific error message
   */
  currency: (errorType, value) => {
    switch (errorType) {
      case 'INVALID':
        return ERROR_MESSAGES.CURRENCY.INVALID_AMOUNT;
      case 'TOO_SMALL':
        return ERROR_MESSAGES.CURRENCY.TOO_SMALL;
      case 'TOO_LARGE':
        return ERROR_MESSAGES.CURRENCY.TOO_LARGE;
      case 'NEGATIVE':
        return ERROR_MESSAGES.CURRENCY.NEGATIVE_AMOUNT;
      case 'ZERO':
        return ERROR_MESSAGES.CURRENCY.ZERO_AMOUNT;
      default:
        return ERROR_MESSAGES.CURRENCY.INVALID_AMOUNT;
    }
  },

  /**
   * Get error message for interest rate validation
   * @param {string} errorType - Type of interest rate error
   * @param {number} value - The invalid value
   * @returns {string} Interest rate-specific error message
   */
  interestRate: (errorType, value) => {
    switch (errorType) {
      case 'INVALID':
        return ERROR_MESSAGES.INTEREST.INVALID_RATE;
      case 'NEGATIVE':
        return ERROR_MESSAGES.INTEREST.NEGATIVE_RATE;
      case 'TOO_HIGH':
        return ERROR_MESSAGES.INTEREST.TOO_HIGH;
      default:
        return ERROR_MESSAGES.INTEREST.INVALID_PERCENTAGE;
    }
  }
};