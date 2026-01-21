/**
 * Validation Functions
 *
 * Comprehensive validation layer with reusable validation functions
 * and consistent error messaging. All validators return structured
 * validation result objects.
 *
 * @fileoverview Input validation functions for financial tracker
 */
/**
 * Validation result structure
 */
export interface ValidationResult<T = unknown> {
  isValid: boolean;
  error: string | null;
  value: T | null;
}

/**
 * Options for amount validation
 */
interface AmountValidationOptions {
  allowZero?: boolean;
  fieldName?: string;
}

/**
 * Options for goal validation
 */
interface GoalValidationOptions {
  fieldName?: string;
}

/**
 * Options for interest rate validation
 */
interface InterestRateValidationOptions {
  fieldName?: string;
}

/**
 * Options for note validation
 */
interface NoteValidationOptions {
  required?: boolean;
  fieldName?: string;
}

/**
 * Validation limits and constraints
 */
export const VALIDATION_LIMITS = {
  AMOUNT: {
    MIN: 0.01,
    MAX: 999999999, // 999 million
    DECIMAL_PLACES: 2
  },
  GOAL: {
    MIN: 1,
    MAX: 999999999, // 999 million
    DECIMAL_PLACES: 2
  },
  INTEREST_RATE: {
    MIN: 0,
    MAX: 99.99,
    DECIMAL_PLACES: 2
  },
  NOTE: {
    MAX_LENGTH: 200,
    MIN_LENGTH: 1
  }
};

/**
 * Helper function to check if value is a valid number
 * @param {*} value - Value to check
 * @returns {boolean} True if value is a valid number
 */
const isValidNumber = (value) => {
  if (value === null || value === undefined || value === '') return false;
  const num = Number(value);
  return !isNaN(num) && isFinite(num);
};

/**
 * Helper function to round number to specified decimal places
 * @param {number} num - Number to round
 * @param {number} decimals - Number of decimal places
 * @returns {number} Rounded number
 */
const roundToDecimals = (num, decimals) => {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

/**
 * Validate monetary amounts (payments, deposits, etc.)
 * @param {*} value - Amount to validate
 * @param {Object} options - Validation options
 * @param {boolean} options.allowZero - Whether to allow zero values
 * @param {string} options.fieldName - Name of the field for error messages
 * @returns {ValidationResult} Validation result
 */
export const validateAmount = (value: unknown, options: AmountValidationOptions = {}): ValidationResult<number> => {
  const { allowZero = false, fieldName = 'Amount' } = options;

  // Check if value exists
  if (value === null || value === undefined || value === '') {
    return {
      isValid: false,
      error: `${fieldName} is required`,
      value: null
    };
  }

  // Check if it's a valid number
  if (!isValidNumber(value)) {
    return {
      isValid: false,
      error: `${fieldName} must be a valid number`,
      value: null
    };
  }

  const numValue = Number(value);

  // Check for negative values
  if (numValue < 0) {
    return {
      isValid: false,
      error: `${fieldName} cannot be negative`,
      value: null
    };
  }

  // Check for zero if not allowed
  if (numValue === 0 && !allowZero) {
    return {
      isValid: false,
      error: `${fieldName} must be greater than zero`,
      value: null
    };
  }

  // Check minimum value (if not allowing zero)
  if (!allowZero && numValue < VALIDATION_LIMITS.AMOUNT.MIN) {
    return {
      isValid: false,
      error: `${fieldName} must be at least $${VALIDATION_LIMITS.AMOUNT.MIN}`,
      value: null
    };
  }

  // Check maximum value
  if (numValue > VALIDATION_LIMITS.AMOUNT.MAX) {
    return {
      isValid: false,
      error: `${fieldName} cannot exceed $${VALIDATION_LIMITS.AMOUNT.MAX.toLocaleString()}`,
      value: null
    };
  }

  // Round to appropriate decimal places
  const roundedValue = roundToDecimals(numValue, VALIDATION_LIMITS.AMOUNT.DECIMAL_PLACES);

  return {
    isValid: true,
    error: null,
    value: roundedValue
  };
};

/**
 * Validate goal amounts (savings goals, debt amounts)
 * @param {*} value - Goal amount to validate
 * @param {Object} options - Validation options
 * @param {string} options.fieldName - Name of the field for error messages
 * @returns {ValidationResult} Validation result
 */
export const validateGoal = (value: unknown, options: GoalValidationOptions = {}): ValidationResult<number> => {
  const { fieldName = 'Goal' } = options;

  // Check if value exists
  if (value === null || value === undefined || value === '') {
    return {
      isValid: false,
      error: `${fieldName} is required`,
      value: null
    };
  }

  // Check if it's a valid number
  if (!isValidNumber(value)) {
    return {
      isValid: false,
      error: `${fieldName} must be a valid number`,
      value: null
    };
  }

  const numValue = Number(value);

  // Check minimum value
  if (numValue < VALIDATION_LIMITS.GOAL.MIN) {
    return {
      isValid: false,
      error: `${fieldName} must be at least $${VALIDATION_LIMITS.GOAL.MIN}`,
      value: null
    };
  }

  // Check maximum value
  if (numValue > VALIDATION_LIMITS.GOAL.MAX) {
    return {
      isValid: false,
      error: `${fieldName} cannot exceed $${VALIDATION_LIMITS.GOAL.MAX.toLocaleString()}`,
      value: null
    };
  }

  // Round to appropriate decimal places
  const roundedValue = roundToDecimals(numValue, VALIDATION_LIMITS.GOAL.DECIMAL_PLACES);

  return {
    isValid: true,
    error: null,
    value: roundedValue
  };
};

/**
 * Validate interest rates (APR percentages)
 * @param {*} value - Interest rate to validate
 * @param {Object} options - Validation options
 * @param {string} options.fieldName - Name of the field for error messages
 * @returns {ValidationResult} Validation result
 */
export const validateInterestRate = (value: unknown, options: InterestRateValidationOptions = {}): ValidationResult<number> => {
  const { fieldName = 'Interest rate' } = options;

  // Check if value exists
  if (value === null || value === undefined || value === '') {
    return {
      isValid: false,
      error: `${fieldName} is required`,
      value: null
    };
  }

  // Check if it's a valid number
  if (!isValidNumber(value)) {
    return {
      isValid: false,
      error: `${fieldName} must be a valid number`,
      value: null
    };
  }

  const numValue = Number(value);

  // Check minimum value (0% is allowed)
  if (numValue < VALIDATION_LIMITS.INTEREST_RATE.MIN) {
    return {
      isValid: false,
      error: `${fieldName} cannot be negative`,
      value: null
    };
  }

  // Check maximum value
  if (numValue > VALIDATION_LIMITS.INTEREST_RATE.MAX) {
    return {
      isValid: false,
      error: `${fieldName} cannot exceed ${VALIDATION_LIMITS.INTEREST_RATE.MAX}%`,
      value: null
    };
  }

  // Round to appropriate decimal places
  const roundedValue = roundToDecimals(numValue, VALIDATION_LIMITS.INTEREST_RATE.DECIMAL_PLACES);

  return {
    isValid: true,
    error: null,
    value: roundedValue
  };
};

/**
 * Validate transaction notes/descriptions
 * @param {*} value - Note text to validate
 * @param {Object} options - Validation options
 * @param {boolean} options.required - Whether the note is required
 * @param {string} options.fieldName - Name of the field for error messages
 * @returns {ValidationResult} Validation result
 */
export const validateNote = (value: unknown, options: NoteValidationOptions = {}): ValidationResult<string> => {
  const { required = false, fieldName = 'Note' } = options;

  // Handle empty values
  if (value === null || value === undefined || value === '') {
    if (required) {
      return {
        isValid: false,
        error: `${fieldName} is required`,
        value: null
      };
    }
    return {
      isValid: true,
      error: null,
      value: ''
    };
  }

  // Ensure it's a string
  const stringValue = String(value).trim();

  // Check minimum length if required
  if (required && stringValue.length < VALIDATION_LIMITS.NOTE.MIN_LENGTH) {
    return {
      isValid: false,
      error: `${fieldName} cannot be empty`,
      value: null
    };
  }

  // Check maximum length
  if (stringValue.length > VALIDATION_LIMITS.NOTE.MAX_LENGTH) {
    return {
      isValid: false,
      error: `${fieldName} cannot exceed ${VALIDATION_LIMITS.NOTE.MAX_LENGTH} characters`,
      value: null
    };
  }

  return {
    isValid: true,
    error: null,
    value: stringValue
  };
};

/**
 * Validate complete transaction objects
 * @param {Object} transaction - Transaction object to validate
 * @param {string} mode - Current mode ('savings' or 'debt')
 * @returns {ValidationResult} Validation result
 */
export const validateTransaction = (transaction, mode) => {
  if (!transaction || typeof transaction !== 'object') {
    return {
      isValid: false,
      error: 'Invalid transaction data',
      value: null
    };
  }

  // Validate amount
  const amountFieldName = mode === 'savings' ? 'Deposit amount' : 'Payment amount';
  const amountValidation = validateAmount(transaction.amount, {
    fieldName: amountFieldName,
    allowZero: false
  });

  if (!amountValidation.isValid) {
    return amountValidation;
  }

  // Validate note (optional)
  const noteValidation = validateNote(transaction.note, {
    required: false,
    fieldName: 'Transaction note'
  });

  if (!noteValidation.isValid) {
    return noteValidation;
  }

  // Create cleaned transaction object
  const cleanedTransaction = {
    ...transaction,
    amount: amountValidation.value,
    note: noteValidation.value
  };

  return {
    isValid: true,
    error: null,
    value: cleanedTransaction
  };
};

/**
 * Validate multiple fields at once
 * @param {Object} fields - Object with field names as keys and values to validate
 * @param {Object} validators - Object with field names as keys and validator functions
 * @returns {Object} Object with validation results for each field
 */
export const validateFields = (
  fields: Record<string, unknown>,
  validators: Record<string, (value: unknown) => ValidationResult>
) => {
  const results: Record<string, ValidationResult> = {};
  let hasErrors = false;

  for (const [fieldName, value] of Object.entries(fields)) {
    if (validators[fieldName]) {
      results[fieldName] = validators[fieldName](value);
      if (!results[fieldName].isValid) {
        hasErrors = true;
      }
    }
  }

  return {
    results,
    isValid: !hasErrors,
    errors: Object.fromEntries(
      Object.entries(results)
        .filter(([_, result]) => !result.isValid)
        .map(([field, result]) => [field, result.error])
    )
  };
};

/**
 * Common validation combinations for different use cases
 */
export const validationPresets = {
  // For adding new transactions
  newTransaction: (amount, note, mode) => {
    return validateFields(
      { amount, note },
      {
        amount: (value) => validateAmount(value, {
          fieldName: mode === 'savings' ? 'Deposit amount' : 'Payment amount'
        }),
        note: (value) => validateNote(value, { required: false })
      }
    );
  },

  // For setting goals
  goalSetting: (goal, mode) => {
    return validateGoal(goal, {
      fieldName: mode === 'savings' ? 'Savings goal' : 'Total debt'
    });
  },

  // For interest rate settings
  interestSettings: (rate) => {
    return validateInterestRate(rate, {
      fieldName: 'Annual interest rate'
    });
  }
};