/**
 * InterestService
 *
 * Service layer for interest-related business logic operations.
 * Handles interest calculations, application, and pending interest tracking.
 * Provides a clean interface for all interest operations with validation.
 *
 * @fileoverview Interest calculation business logic service
 */

import { MODES, LABELS, INTEREST } from '../constants';
import { calculatePendingInterest, shouldApplyInterest } from '../utils/interestCalculator';
import { validateInterestRate } from '../utils/validators';

/**
 * Interest service error codes
 */
export const INTEREST_SERVICE_ERROR_CODES = {
  INVALID_RATE: 'INVALID_RATE',
  INVALID_BALANCE: 'INVALID_BALANCE',
  INVALID_DATE: 'INVALID_DATE',
  INVALID_MODE: 'INVALID_MODE',
  CALCULATION_ERROR: 'CALCULATION_ERROR'
};

/**
 * InterestService class
 * Handles all interest-related business logic
 */
export class InterestService {

  /**
   * Calculate pending interest for a debt balance
   * @param {number} balance - Current debt balance
   * @param {number} interestRate - Annual interest rate percentage
   * @param {string|null} lastDate - Last interest application date (ISO string)
   * @returns {Object} Result with pending interest and days pending
   */
  static calculatePendingInterest(balance, interestRate, lastDate = null) {
    try {
      // Validate inputs
      if (typeof balance !== 'number' || balance < 0) {
        return {
          success: false,
          error: 'Balance must be a non-negative number',
          errorCode: INTEREST_SERVICE_ERROR_CODES.INVALID_BALANCE,
          data: { pendingInterest: 0, daysPending: 0 }
        };
      }

      const rateValidation = validateInterestRate(interestRate);
      if (!rateValidation.isValid) {
        return {
          success: false,
          error: rateValidation.error,
          errorCode: INTEREST_SERVICE_ERROR_CODES.INVALID_RATE,
          data: { pendingInterest: 0, daysPending: 0 }
        };
      }

      // If balance is 0, no interest
      if (balance === 0) {
        return {
          success: true,
          data: { pendingInterest: 0, daysPending: 0 }
        };
      }

      // Use the existing utility function
      const result = calculatePendingInterest(balance, rateValidation.value, lastDate);

      return {
        success: true,
        data: result
      };

    } catch (error) {
      console.error('InterestService.calculatePendingInterest error:', error);
      return {
        success: false,
        error: `Failed to calculate pending interest: ${error.message}`,
        errorCode: INTEREST_SERVICE_ERROR_CODES.CALCULATION_ERROR,
        data: { pendingInterest: 0, daysPending: 0 }
      };
    }
  }

  /**
   * Check if interest should be automatically applied
   * @param {string|null} lastDate - Last interest application date
   * @param {number} thresholdDays - Days threshold for auto-application
   * @returns {Object} Result indicating if interest should be applied
   */
  static shouldAutoApplyInterest(lastDate = null, thresholdDays = INTEREST.AUTO_APPLY_THRESHOLD_DAYS) {
    try {
      if (typeof thresholdDays !== 'number' || thresholdDays < 0) {
        return {
          success: false,
          error: 'Threshold days must be a non-negative number',
          errorCode: INTEREST_SERVICE_ERROR_CODES.INVALID_DATE,
          data: false
        };
      }

      const shouldApply = shouldApplyInterest(lastDate, thresholdDays);

      return {
        success: true,
        data: shouldApply
      };

    } catch (error) {
      console.error('InterestService.shouldAutoApplyInterest error:', error);
      return {
        success: false,
        error: `Failed to check auto-apply condition: ${error.message}`,
        errorCode: INTEREST_SERVICE_ERROR_CODES.CALCULATION_ERROR,
        data: false
      };
    }
  }

  /**
   * Create an interest transaction object
   * @param {number} interestAmount - Amount of interest to charge
   * @param {number} daysPending - Number of days interest was pending
   * @param {number} currentTotal - Current running total
   * @param {string} note - Note for the transaction (optional)
   * @returns {Object} Result with interest transaction
   */
  static createInterestTransaction(interestAmount, daysPending, currentTotal = 0, note = null) {
    try {
      // Validate interest amount
      if (typeof interestAmount !== 'number' || interestAmount < 0) {
        return {
          success: false,
          error: 'Interest amount must be a non-negative number',
          errorCode: INTEREST_SERVICE_ERROR_CODES.INVALID_BALANCE
        };
      }

      // Validate days pending
      if (typeof daysPending !== 'number' || daysPending < 0) {
        return {
          success: false,
          error: 'Days pending must be a non-negative number',
          errorCode: INTEREST_SERVICE_ERROR_CODES.INVALID_DATE
        };
      }

      // If no interest, return early
      if (interestAmount === 0) {
        return {
          success: true,
          data: null // No transaction needed
        };
      }

      const transaction = {
        id: Date.now(),
        amount: interestAmount,
        date: new Date().toISOString(),
        note: note || LABELS.COMMON.MONTHLY_INTEREST_CHARGE,
        type: 'interest',
        days: daysPending,
        runningTotal: currentTotal + interestAmount
      };

      return {
        success: true,
        data: transaction
      };

    } catch (error) {
      console.error('InterestService.createInterestTransaction error:', error);
      return {
        success: false,
        error: `Failed to create interest transaction: ${error.message}`,
        errorCode: INTEREST_SERVICE_ERROR_CODES.CALCULATION_ERROR
      };
    }
  }

  /**
   * Apply interest charge to a debt balance
   * @param {number} balance - Current debt balance
   * @param {number} interestRate - Annual interest rate percentage
   * @param {string|null} lastDate - Last interest application date
   * @param {number} currentTotal - Current running total
   * @returns {Object} Result with interest transaction and updated state
   */
  static applyInterestCharge(balance, interestRate, lastDate = null, currentTotal = 0) {
    try {
      // Validate balance
      if (typeof balance !== 'number' || balance <= 0) {
        return {
          success: false,
          error: 'Balance must be a positive number for interest application',
          errorCode: INTEREST_SERVICE_ERROR_CODES.INVALID_BALANCE
        };
      }

      // Calculate pending interest
      const pendingResult = this.calculatePendingInterest(balance, interestRate, lastDate);
      if (!pendingResult.success) {
        return pendingResult;
      }

      const { pendingInterest, daysPending } = pendingResult.data;

      // Create interest transaction if there's pending interest
      if (pendingInterest > 0) {
        const transactionResult = this.createInterestTransaction(
          pendingInterest,
          daysPending,
          currentTotal
        );

        if (!transactionResult.success) {
          return transactionResult;
        }

        return {
          success: true,
          data: {
            transaction: transactionResult.data,
            newInterestDate: new Date().toISOString(),
            interestApplied: true,
            amount: pendingInterest,
            days: daysPending
          }
        };
      }

      // No interest to apply
      return {
        success: true,
        data: {
          transaction: null,
          newInterestDate: null,
          interestApplied: false,
          amount: 0,
          days: 0
        }
      };

    } catch (error) {
      console.error('InterestService.applyInterestCharge error:', error);
      return {
        success: false,
        error: `Failed to apply interest charge: ${error.message}`,
        errorCode: INTEREST_SERVICE_ERROR_CODES.CALCULATION_ERROR
      };
    }
  }

  /**
   * Update pending interest state for debt mode
   * @param {string} mode - Current tracking mode
   * @param {number} remaining - Remaining debt balance
   * @param {number} interestRate - Annual interest rate
   * @param {string|null} lastInterestDate - Last interest application date
   * @param {Array} transactions - Current transactions
   * @returns {Object} Result with pending interest state
   */
  static updatePendingInterest(mode, remaining, interestRate, lastInterestDate = null, transactions = []) {
    try {
      // Validate mode
      if (mode !== MODES.DEBT && mode !== MODES.SAVINGS) {
        return {
          success: false,
          error: `Invalid mode: ${mode}`,
          errorCode: INTEREST_SERVICE_ERROR_CODES.INVALID_MODE,
          data: { pendingInterest: 0, daysPending: 0 }
        };
      }

      // Only calculate for debt mode with remaining balance
      if (mode === MODES.DEBT && remaining > 0) {
        // Determine last date for interest calculation
        const lastDate = lastInterestDate ||
          (transactions.length > 0 ? transactions[transactions.length - 1].date : new Date().toISOString());

        // Calculate pending interest
        return this.calculatePendingInterest(remaining, interestRate, lastDate);
      }

      // No pending interest for savings mode or zero balance
      return {
        success: true,
        data: { pendingInterest: 0, daysPending: 0 }
      };

    } catch (error) {
      console.error('InterestService.updatePendingInterest error:', error);
      return {
        success: false,
        error: `Failed to update pending interest: ${error.message}`,
        errorCode: INTEREST_SERVICE_ERROR_CODES.CALCULATION_ERROR,
        data: { pendingInterest: 0, daysPending: 0 }
      };
    }
  }

  /**
   * Validate interest rate
   * @param {number} rate - Interest rate to validate
   * @returns {Object} Validation result
   */
  static validateRate(rate) {
    return validateInterestRate(rate);
  }

  /**
   * Convert annual rate to daily rate
   * @param {number} annualRate - Annual interest rate percentage
   * @returns {number} Daily interest rate
   */
  static getDailyRate(annualRate) {
    return annualRate / 365;
  }

  /**
   * Convert daily rate to annual rate
   * @param {number} dailyRate - Daily interest rate
   * @returns {number} Annual interest rate percentage
   */
  static getAnnualRate(dailyRate) {
    return dailyRate * 365;
  }
}

export default InterestService;