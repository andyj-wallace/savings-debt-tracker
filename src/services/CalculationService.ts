/**
 * CalculationService
 *
 * Service layer for financial calculation operations.
 * Handles percentage calculations, remaining balance calculations, and progress tracking.
 * Provides a clean interface for all financial calculations with validation.
 *
 * @fileoverview Financial calculation business logic service
 */

import { MODES } from '../constants';
import { validateGoal } from '../utils/validators';

/**
 * Calculation service error codes
 */
export const CALCULATION_SERVICE_ERROR_CODES = {
  INVALID_GOAL: 'INVALID_GOAL',
  INVALID_CURRENT: 'INVALID_CURRENT',
  INVALID_MODE: 'INVALID_MODE',
  DIVISION_BY_ZERO: 'DIVISION_BY_ZERO',
  CALCULATION_ERROR: 'CALCULATION_ERROR'
};

/**
 * CalculationService class
 * Handles all financial calculation business logic
 */
export class CalculationService {

  /**
   * Calculate progress percentage and remaining amount based on mode
   * @param {string} mode - Tracking mode (savings or debt)
   * @param {number} current - Current balance/total
   * @param {number} goal - Target goal amount
   * @returns {Object} Result with percentage and remaining amounts
   */
  static calculateProgress(mode, current, goal) {
    try {
      // Validate mode
      if (mode !== MODES.SAVINGS && mode !== MODES.DEBT) {
        return {
          success: false,
          error: `Invalid mode: ${mode}. Must be '${MODES.SAVINGS}' or '${MODES.DEBT}'`,
          errorCode: CALCULATION_SERVICE_ERROR_CODES.INVALID_MODE,
          data: { percentage: 0, remaining: goal || 0 }
        };
      }

      // Validate goal
      const goalValidation = validateGoal(goal);
      if (!goalValidation.isValid) {
        return {
          success: false,
          error: goalValidation.error,
          errorCode: CALCULATION_SERVICE_ERROR_CODES.INVALID_GOAL,
          data: { percentage: 0, remaining: goal || 0 }
        };
      }

      // Validate current
      if (typeof current !== 'number') {
        return {
          success: false,
          error: 'Current amount must be a number',
          errorCode: CALCULATION_SERVICE_ERROR_CODES.INVALID_CURRENT,
          data: { percentage: 0, remaining: goalValidation.value }
        };
      }

      const validatedGoal = goalValidation.value;

      // Prevent division by zero
      if (validatedGoal === 0) {
        return {
          success: false,
          error: 'Goal cannot be zero for percentage calculation',
          errorCode: CALCULATION_SERVICE_ERROR_CODES.DIVISION_BY_ZERO,
          data: { percentage: 0, remaining: 0 }
        };
      }

      let calculatedPercentage;
      let calculatedRemaining;

      if (mode === MODES.SAVINGS) {
        // For savings: percentage of goal reached
        calculatedPercentage = Math.min((current / validatedGoal) * 100, 100);
        calculatedRemaining = Math.max(validatedGoal - current, 0);
      } else {
        // For debt: percentage of debt paid off
        // current is negative (we subtract payments), so debt remaining is goal + current
        const debtRemaining = Math.max(validatedGoal + current, 0); // current is negative, so this subtracts
        const amountPaidOff = validatedGoal - debtRemaining;
        calculatedPercentage = Math.min((amountPaidOff / validatedGoal) * 100, 100);
        calculatedRemaining = debtRemaining;
      }

      // Ensure percentage is never negative
      calculatedPercentage = Math.max(calculatedPercentage, 0);

      return {
        success: true,
        data: {
          percentage: calculatedPercentage,
          remaining: calculatedRemaining
        }
      };

    } catch (error) {
      console.error('CalculationService.calculateProgress error:', error);
      return {
        success: false,
        error: `Failed to calculate progress: ${error.message}`,
        errorCode: CALCULATION_SERVICE_ERROR_CODES.CALCULATION_ERROR,
        data: { percentage: 0, remaining: goal || 0 }
      };
    }
  }

  /**
   * Calculate savings progress specifically
   * @param {number} current - Current savings amount
   * @param {number} goal - Savings goal
   * @returns {Object} Result with savings progress
   */
  static calculateSavingsProgress(current, goal) {
    return this.calculateProgress(MODES.SAVINGS, current, goal);
  }

  /**
   * Calculate debt progress specifically
   * @param {number} current - Current debt balance (negative payments)
   * @param {number} goal - Original debt amount
   * @returns {Object} Result with debt progress
   */
  static calculateDebtProgress(current, goal) {
    return this.calculateProgress(MODES.DEBT, current, goal);
  }

  /**
   * Calculate remaining amount for a given mode
   * @param {string} mode - Tracking mode
   * @param {number} current - Current amount
   * @param {number} goal - Goal amount
   * @returns {Object} Result with remaining amount
   */
  static calculateRemaining(mode, current, goal) {
    const result = this.calculateProgress(mode, current, goal);
    return {
      success: result.success,
      error: result.error,
      errorCode: result.errorCode,
      data: result.data ? result.data.remaining : 0
    };
  }

  /**
   * Calculate percentage complete for a given mode
   * @param {string} mode - Tracking mode
   * @param {number} current - Current amount
   * @param {number} goal - Goal amount
   * @returns {Object} Result with percentage complete
   */
  static calculatePercentage(mode, current, goal) {
    const result = this.calculateProgress(mode, current, goal);
    return {
      success: result.success,
      error: result.error,
      errorCode: result.errorCode,
      data: result.data ? result.data.percentage : 0
    };
  }

  /**
   * Check if goal is reached
   * @param {string} mode - Tracking mode
   * @param {number} current - Current amount
   * @param {number} goal - Goal amount
   * @returns {Object} Result indicating if goal is reached
   */
  static isGoalReached(mode, current, goal) {
    try {
      const result = this.calculateProgress(mode, current, goal);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          errorCode: result.errorCode,
          data: false
        };
      }

      const isReached = result.data.percentage >= 100;

      return {
        success: true,
        data: isReached
      };

    } catch (error) {
      console.error('CalculationService.isGoalReached error:', error);
      return {
        success: false,
        error: `Failed to check goal status: ${error.message}`,
        errorCode: CALCULATION_SERVICE_ERROR_CODES.CALCULATION_ERROR,
        data: false
      };
    }
  }

  /**
   * Calculate how much is needed to reach the goal
   * @param {string} mode - Tracking mode
   * @param {number} current - Current amount
   * @param {number} goal - Goal amount
   * @returns {Object} Result with amount needed
   */
  static calculateAmountNeeded(mode, current, goal) {
    try {
      const result = this.calculateProgress(mode, current, goal);

      if (!result.success) {
        return result;
      }

      return {
        success: true,
        data: result.data.remaining
      };

    } catch (error) {
      console.error('CalculationService.calculateAmountNeeded error:', error);
      return {
        success: false,
        error: `Failed to calculate amount needed: ${error.message}`,
        errorCode: CALCULATION_SERVICE_ERROR_CODES.CALCULATION_ERROR,
        data: 0
      };
    }
  }

  /**
   * Calculate total from transactions array
   * @param {Array} transactions - Array of transaction objects
   * @returns {Object} Result with total amount
   */
  static calculateTotalFromTransactions(transactions) {
    try {
      if (!Array.isArray(transactions)) {
        return {
          success: false,
          error: 'Transactions must be an array',
          errorCode: CALCULATION_SERVICE_ERROR_CODES.CALCULATION_ERROR,
          data: 0
        };
      }

      const total = transactions.reduce((sum, transaction) => {
        if (transaction && typeof transaction.amount === 'number') {
          return sum + transaction.amount;
        }
        return sum;
      }, 0);

      return {
        success: true,
        data: total
      };

    } catch (error) {
      console.error('CalculationService.calculateTotalFromTransactions error:', error);
      return {
        success: false,
        error: `Failed to calculate total: ${error.message}`,
        errorCode: CALCULATION_SERVICE_ERROR_CODES.CALCULATION_ERROR,
        data: 0
      };
    }
  }

  /**
   * Format currency amount
   * @param {number} amount - Amount to format
   * @param {string} currency - Currency code (default: USD)
   * @returns {string} Formatted currency string
   */
  static formatCurrency(amount, currency = 'USD') {
    try {
      if (typeof amount !== 'number') {
        return '$0.00';
      }

      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
      }).format(amount);

    } catch (error) {
      console.error('CalculationService.formatCurrency error:', error);
      return `$${amount.toFixed(2)}`;
    }
  }

  /**
   * Calculate monthly payment needed to reach goal in given months
   * @param {string} mode - Tracking mode
   * @param {number} current - Current amount
   * @param {number} goal - Goal amount
   * @param {number} months - Number of months
   * @param {number} interestRate - Annual interest rate (for debt mode)
   * @returns {Object} Result with monthly payment amount
   */
  static calculateMonthlyPayment(mode, current, goal, months, interestRate = 0) {
    try {
      // Validate inputs
      if (typeof months !== 'number' || months <= 0) {
        return {
          success: false,
          error: 'Months must be a positive number',
          errorCode: CALCULATION_SERVICE_ERROR_CODES.CALCULATION_ERROR,
          data: 0
        };
      }

      const progressResult = this.calculateProgress(mode, current, goal);
      if (!progressResult.success) {
        return progressResult;
      }

      const { remaining } = progressResult.data;

      if (remaining <= 0) {
        return {
          success: true,
          data: 0 // Goal already reached
        };
      }

      let monthlyPayment;

      if (mode === MODES.SAVINGS) {
        // Simple calculation for savings
        monthlyPayment = remaining / months;
      } else {
        // For debt, consider interest (simplified calculation)
        if (interestRate > 0) {
          const monthlyRate = interestRate / 100 / 12;
          const factor = Math.pow(1 + monthlyRate, months);
          monthlyPayment = (remaining * monthlyRate * factor) / (factor - 1);
        } else {
          monthlyPayment = remaining / months;
        }
      }

      return {
        success: true,
        data: Math.max(monthlyPayment, 0)
      };

    } catch (error) {
      console.error('CalculationService.calculateMonthlyPayment error:', error);
      return {
        success: false,
        error: `Failed to calculate monthly payment: ${error.message}`,
        errorCode: CALCULATION_SERVICE_ERROR_CODES.CALCULATION_ERROR,
        data: 0
      };
    }
  }
}

export default CalculationService;