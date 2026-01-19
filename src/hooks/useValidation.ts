/**
 * useValidation Hook
 *
 * Custom React hook that provides validation functionality for components.
 * Manages validation state, error messages, and provides convenient
 * validation methods for different types of inputs.
 *
 * @fileoverview Custom hook for component validation access
 */

import { useState, useCallback, useMemo } from 'react';
import {
  validateAmount,
  validateGoal,
  validateInterestRate,
  validateNote,
  validateTransaction,
  validationPresets,
  validateFields
} from '../utils/validators';
import { createError, ERROR_SEVERITY } from '../utils/errorMessages';

/**
 * Custom hook for form validation
 * @param {Object} options - Hook configuration options
 * @param {boolean} options.validateOnChange - Whether to validate on every change
 * @param {boolean} options.validateOnBlur - Whether to validate on field blur
 * @param {string} options.mode - Current app mode for context-specific validation
 * @returns {Object} Validation methods and state
 */
interface UseValidationOptions {
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  mode?: string;
}

export const useValidation = (options: UseValidationOptions = {}) => {
  const {
    validateOnChange = false,
    validateOnBlur = true,
    mode = 'savings'
  } = options;

  // Validation state
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isValidating, setIsValidating] = useState(false);

  /**
   * Clear all validation errors
   */
  const clearErrors = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  /**
   * Clear error for a specific field
   * @param {string} fieldName - Name of the field to clear
   */
  const clearFieldError = useCallback((fieldName) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  /**
   * Set error for a specific field
   * @param {string} fieldName - Name of the field
   * @param {string} errorMessage - Error message to set
   */
  const setFieldError = useCallback((fieldName, errorMessage) => {
    setErrors(prev => ({
      ...prev,
      [fieldName]: errorMessage
    }));
  }, []);

  /**
   * Mark a field as touched
   * @param {string} fieldName - Name of the field
   */
  const touchField = useCallback((fieldName) => {
    setTouched(prev => ({
      ...prev,
      [fieldName]: true
    }));
  }, []);

  /**
   * Validate a single field
   * @param {string} fieldName - Name of the field to validate
   * @param {*} value - Value to validate
   * @param {Object} validationOptions - Options for validation
   * @returns {Object} Validation result
   */
  const validateField = useCallback(async (fieldName, value, validationOptions = {}) => {
    setIsValidating(true);

    let result;

    try {
      switch (fieldName) {
        case 'amount':
        case 'deposit':
        case 'payment':
          result = validateAmount(value, {
            fieldName: mode === 'savings' ? 'Deposit amount' : 'Payment amount',
            ...validationOptions
          });
          break;

        case 'goal':
        case 'savingsGoal':
        case 'debtAmount':
          result = validateGoal(value, {
            fieldName: mode === 'savings' ? 'Savings goal' : 'Total debt',
            ...validationOptions
          });
          break;

        case 'interestRate':
        case 'annualRate':
          result = validateInterestRate(value, {
            fieldName: 'Interest rate',
            ...validationOptions
          });
          break;

        case 'note':
        case 'transactionNote':
          result = validateNote(value, {
            fieldName: 'Note',
            ...validationOptions
          });
          break;

        default:
          result = {
            isValid: true,
            error: null,
            value: value
          };
      }

      // Update error state
      if (result.isValid) {
        clearFieldError(fieldName);
      } else {
        setFieldError(fieldName, result.error);
      }

    } catch (error) {
      result = {
        isValid: false,
        error: 'Validation failed. Please try again.',
        value: null
      };
      setFieldError(fieldName, result.error);
    } finally {
      setIsValidating(false);
    }

    return result;
  }, [mode, clearFieldError, setFieldError]);

  /**
   * Validate multiple fields at once
   * @param {Object} fields - Object with field names and values
   * @param {Object} validationOptions - Options for validation
   * @returns {Object} Validation results for all fields
   */
  const validateMultipleFields = useCallback(async (fields, validationOptions = {}) => {
    setIsValidating(true);

    const results = {};
    const newErrors = {};

    try {
      for (const [fieldName, value] of Object.entries(fields)) {
        const result = await validateField(fieldName, value, validationOptions);
        results[fieldName] = result;

        if (!result.isValid) {
          newErrors[fieldName] = result.error;
        }
      }

      setErrors(prev => ({ ...prev, ...newErrors }));

    } finally {
      setIsValidating(false);
    }

    const isValid = Object.values(results).every((result: { isValid: boolean }) => result.isValid);

    return {
      results,
      isValid,
      errors: newErrors
    };
  }, [validateField]);

  /**
   * Validate a complete transaction
   * @param {Object} transaction - Transaction object to validate
   * @returns {Object} Validation result
   */
  const validateTransactionObject = useCallback((transaction) => {
    return validateTransaction(transaction, mode);
  }, [mode]);

  /**
   * Create validation handlers for form inputs
   * @param {string} fieldName - Name of the field
   * @param {Object} options - Handler options
   * @returns {Object} Input handlers
   */
  interface FieldHandlerOptions {
    validateOnChange?: boolean;
    validateOnBlur?: boolean;
    [key: string]: unknown;
  }

  const createFieldHandlers = useCallback((fieldName: string, options: FieldHandlerOptions = {}) => {
    const {
      validateOnChange: fieldValidateOnChange = validateOnChange,
      validateOnBlur: fieldValidateOnBlur = validateOnBlur,
      ...validationOptions
    } = options;

    return {
      onChange: async (value) => {
        if (fieldValidateOnChange) {
          await validateField(fieldName, value, validationOptions);
        } else {
          // Clear error when user starts typing if field was previously touched
          if (touched[fieldName] && errors[fieldName]) {
            clearFieldError(fieldName);
          }
        }
      },

      onBlur: async (value) => {
        touchField(fieldName);
        if (fieldValidateOnBlur) {
          await validateField(fieldName, value, validationOptions);
        }
      }
    };
  }, [validateOnChange, validateOnBlur, touched, errors, validateField, touchField, clearFieldError]);

  /**
   * Validation presets for common use cases
   */
  const presets = useMemo(() => ({
    /**
     * Validate new transaction form
     * @param {number} amount - Transaction amount
     * @param {string} note - Transaction note
     * @returns {Object} Validation result
     */
    newTransaction: (amount, note) => {
      return validationPresets.newTransaction(amount, note, mode);
    },

    /**
     * Validate goal setting
     * @param {number} goal - Goal amount
     * @returns {Object} Validation result
     */
    goalSetting: (goal) => {
      return validationPresets.goalSetting(goal, mode);
    },

    /**
     * Validate interest settings
     * @param {number} rate - Interest rate
     * @returns {Object} Validation result
     */
    interestSettings: (rate) => {
      return validationPresets.interestSettings(rate);
    }
  }), [mode]);

  /**
   * Get validation state for a specific field
   * @param {string} fieldName - Name of the field
   * @returns {Object} Field validation state
   */
  const getFieldState = useCallback((fieldName) => {
    return {
      error: errors[fieldName] || null,
      hasError: !!errors[fieldName],
      isTouched: !!touched[fieldName],
      showError: !!touched[fieldName] && !!errors[fieldName]
    };
  }, [errors, touched]);

  /**
   * Check if the entire form is valid
   * @param {Array} fieldNames - Optional array of field names to check
   * @returns {boolean} Whether all fields are valid
   */
  const isFormValid = useCallback((fieldNames = null) => {
    const fieldsToCheck = fieldNames || Object.keys(errors);
    return fieldsToCheck.every(fieldName => !errors[fieldName]);
  }, [errors]);

  /**
   * Get all current validation errors
   * @returns {Object} All current errors
   */
  const getAllErrors = useCallback(() => {
    return { ...errors };
  }, [errors]);

  /**
   * Check if any field has been touched
   * @returns {boolean} Whether any field has been touched
   */
  const hasAnyTouched = useCallback(() => {
    return Object.keys(touched).length > 0;
  }, [touched]);

  return {
    // Validation methods
    validateField,
    validateMultipleFields,
    validateTransactionObject,
    presets,

    // State management
    clearErrors,
    clearFieldError,
    setFieldError,
    touchField,

    // Field handlers
    createFieldHandlers,

    // State getters
    getFieldState,
    isFormValid,
    getAllErrors,
    hasAnyTouched,

    // Current state
    errors,
    touched,
    isValidating,
    mode
  };
};

/**
 * Simplified validation hook for basic use cases
 * @param {string} fieldName - Name of the field to validate
 * @param {Object} options - Validation options
 * @returns {Object} Simple validation interface
 */
export const useFieldValidation = (fieldName, options = {}) => {
  const validation = useValidation(options);
  const fieldState = validation.getFieldState(fieldName);

  return {
    ...fieldState,
    validate: (value) => validation.validateField(fieldName, value, options),
    handlers: validation.createFieldHandlers(fieldName, options),
    clear: () => validation.clearFieldError(fieldName)
  };
};

export default useValidation;