/**
 * TransactionService
 *
 * Service layer for transaction-related business logic operations.
 * Handles transaction creation, deletion, validation, and running total calculations.
 * Provides a clean interface for transaction operations with built-in error handling.
 *
 * @fileoverview Transaction business logic service
 */

import { MODES, LABELS } from '../constants';
import { validateAmount } from '../utils/validators';

/**
 * Transaction service error codes
 */
export const TRANSACTION_SERVICE_ERROR_CODES = {
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  INVALID_NOTE: 'INVALID_NOTE',
  INVALID_MODE: 'INVALID_MODE',
  TRANSACTION_NOT_FOUND: 'TRANSACTION_NOT_FOUND',
  CALCULATION_ERROR: 'CALCULATION_ERROR'
};

/**
 * TransactionService class
 * Handles all transaction-related business logic
 */
export class TransactionService {

  /**
   * Create a new transaction object
   * @param {number} amount - Transaction amount
   * @param {string} note - Transaction note/description
   * @param {string} mode - Current tracking mode (savings/debt)
   * @param {number} currentTotal - Current running total
   * @param {string} type - Transaction type ('transaction' or 'interest')
   * @param {number} days - Days for interest transactions
   * @returns {Object} Result object with success/error and transaction data
   */
  static createTransaction(amount, note, mode, currentTotal = 0, type = 'transaction', days = null) {
    try {
      // Validate amount
      const amountValidation = validateAmount(amount);
      if (!amountValidation.isValid) {
        return {
          success: false,
          error: amountValidation.error,
          errorCode: TRANSACTION_SERVICE_ERROR_CODES.INVALID_AMOUNT
        };
      }

      // Validate note
      if (!note || typeof note !== 'string' || note.trim().length === 0) {
        return {
          success: false,
          error: 'Transaction note is required',
          errorCode: TRANSACTION_SERVICE_ERROR_CODES.INVALID_NOTE
        };
      }

      // Validate mode
      if (mode !== MODES.SAVINGS && mode !== MODES.DEBT) {
        return {
          success: false,
          error: `Invalid mode: ${mode}`,
          errorCode: TRANSACTION_SERVICE_ERROR_CODES.INVALID_MODE
        };
      }

      // Calculate transaction amount based on mode
      let transactionAmount = amountValidation.value;
      if (mode === MODES.DEBT && type === 'transaction') {
        transactionAmount = -transactionAmount; // Payments reduce debt (negative)
      }

      // Calculate new running total
      const newRunningTotal = currentTotal + transactionAmount;

      // Create transaction object
      const transaction = {
        id: Date.now() + (type === 'interest' ? 0 : 1), // Ensure unique IDs
        amount: transactionAmount,
        date: new Date().toISOString(),
        note: note.trim(),
        type: type,
        runningTotal: newRunningTotal
      };

      // Add days field for interest transactions
      if (type === 'interest' && typeof days === 'number') {
        transaction.days = days;
      }

      return {
        success: true,
        data: transaction
      };

    } catch (error) {
      console.error('TransactionService.createTransaction error:', error);
      return {
        success: false,
        error: `Failed to create transaction: ${error.message}`,
        errorCode: TRANSACTION_SERVICE_ERROR_CODES.CALCULATION_ERROR
      };
    }
  }

  /**
   * Add a new transaction to existing transactions list
   * @param {Array} transactions - Current transactions array
   * @param {number} amount - Transaction amount
   * @param {string} note - Transaction note
   * @param {string} mode - Current tracking mode
   * @param {number} pendingInterest - Pending interest amount
   * @param {number} daysPending - Days of pending interest
   * @param {number} current - Current balance
   * @param {number} remaining - Remaining balance
   * @returns {Object} Result with new transactions array
   */
  static addTransaction(transactions, amount, note, mode, pendingInterest = 0, daysPending = 0, current = 0, remaining = 0) {
    try {
      let newTransactions = [...transactions];
      let latestRunningTotal = current;

      // For debt mode, add any pending interest first
      if (mode === MODES.DEBT && remaining > 0 && pendingInterest > 0) {
        const interestResult = this.createTransaction(
          pendingInterest,
          LABELS.COMMON.INTEREST_CHARGE,
          mode,
          latestRunningTotal,
          'interest',
          daysPending
        );

        if (!interestResult.success) {
          return interestResult;
        }

        newTransactions.push(interestResult.data);
        latestRunningTotal = interestResult.data.runningTotal;
      }

      // Create the main transaction
      const transactionResult = this.createTransaction(
        amount,
        note,
        mode,
        latestRunningTotal,
        'transaction'
      );

      if (!transactionResult.success) {
        return transactionResult;
      }

      newTransactions.push(transactionResult.data);

      return {
        success: true,
        data: {
          transactions: newTransactions,
          addedInterest: mode === MODES.DEBT && remaining > 0 && pendingInterest > 0
        }
      };

    } catch (error) {
      console.error('TransactionService.addTransaction error:', error);
      return {
        success: false,
        error: `Failed to add transaction: ${error.message}`,
        errorCode: TRANSACTION_SERVICE_ERROR_CODES.CALCULATION_ERROR
      };
    }
  }

  /**
   * Delete a transaction and recalculate running totals
   * @param {Array} transactions - Current transactions array
   * @param {number|string} transactionId - ID of transaction to delete
   * @returns {Object} Result with updated transactions array
   */
  static deleteTransaction(transactions, transactionId) {
    try {
      // Find the transaction to delete
      const transactionExists = transactions.some(t => t.id === transactionId);
      if (!transactionExists) {
        return {
          success: false,
          error: `Transaction with ID ${transactionId} not found`,
          errorCode: TRANSACTION_SERVICE_ERROR_CODES.TRANSACTION_NOT_FOUND
        };
      }

      // Filter out the transaction
      const updatedTransactions = transactions.filter(t => t.id !== transactionId);

      // Recalculate running totals
      const recalculatedTransactions = this.recalculateRunningTotals(updatedTransactions);

      return {
        success: true,
        data: {
          transactions: recalculatedTransactions,
          shouldResetInterestDate: recalculatedTransactions.length === 0
        }
      };

    } catch (error) {
      console.error('TransactionService.deleteTransaction error:', error);
      return {
        success: false,
        error: `Failed to delete transaction: ${error.message}`,
        errorCode: TRANSACTION_SERVICE_ERROR_CODES.CALCULATION_ERROR
      };
    }
  }

  /**
   * Recalculate running totals for a transactions array
   * @param {Array} transactions - Transactions array to recalculate
   * @returns {Array} Transactions with updated running totals
   */
  static recalculateRunningTotals(transactions) {
    let runningTotal = 0;
    return transactions.map(transaction => {
      runningTotal += transaction.amount;
      return {
        ...transaction,
        runningTotal
      };
    });
  }

  /**
   * Calculate current total from transactions
   * @param {Array} transactions - Transactions array
   * @returns {number} Current total
   */
  static calculateCurrentTotal(transactions) {
    return transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  }

  /**
   * Get the last transaction date
   * @param {Array} transactions - Transactions array
   * @returns {string|null} ISO date string of last transaction or null
   */
  static getLastTransactionDate(transactions) {
    if (!transactions || transactions.length === 0) {
      return null;
    }
    return transactions[transactions.length - 1].date;
  }

  /**
   * Validate transactions array structure
   * @param {Array} transactions - Transactions to validate
   * @returns {Object} Validation result
   */
  static validateTransactions(transactions) {
    try {
      if (!Array.isArray(transactions)) {
        return {
          isValid: false,
          error: 'Transactions must be an array'
        };
      }

      for (let i = 0; i < transactions.length; i++) {
        const transaction = transactions[i];

        if (!transaction || typeof transaction !== 'object') {
          return {
            isValid: false,
            error: `Transaction ${i} is not a valid object`
          };
        }

        if (typeof transaction.id === 'undefined') {
          return {
            isValid: false,
            error: `Transaction ${i} missing required field: id`
          };
        }

        if (typeof transaction.amount !== 'number') {
          return {
            isValid: false,
            error: `Transaction ${i} missing or invalid required field: amount`
          };
        }

        if (typeof transaction.date !== 'string') {
          return {
            isValid: false,
            error: `Transaction ${i} missing or invalid required field: date`
          };
        }
      }

      return {
        isValid: true,
        data: transactions
      };

    } catch (error) {
      return {
        isValid: false,
        error: `Transaction validation error: ${error.message}`
      };
    }
  }
}

export default TransactionService;