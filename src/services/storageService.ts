/**
 * StorageService
 *
 * High-level storage service that provides type-safe, validated storage
 * operations for the financial tracker application. This service abstracts
 * storage operations and provides application-specific methods with
 * built-in validation and error handling.
 *
 * @fileoverview Application-specific storage service with type safety
 */

import { LocalStorageAdapter } from './storage/LocalStorageAdapter';
import { STORAGE_KEYS, DEFAULTS, MODES, TRANSACTION_TYPES } from '../constants';
import { validateGoal, validateInterestRate, validateTransaction } from '../utils/validators';

/**
 * Storage service error codes
 */
export const STORAGE_SERVICE_ERROR_CODES = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  STORAGE_FAILED: 'STORAGE_FAILED',
  RETRIEVAL_FAILED: 'RETRIEVAL_FAILED',
  INVALID_DATA: 'INVALID_DATA'
};

/**
 * Storage service class
 * Provides type-safe, validated storage operations
 */
export class StorageService {
  private adapter: LocalStorageAdapter;

  constructor(storageAdapter: LocalStorageAdapter | null = null) {
    this.adapter = storageAdapter || new LocalStorageAdapter();
  }

  /**
   * Initialize storage service and test adapter
   * @returns {Promise<Object>} Initialization result
   */
  async initialize() {
    try {
      const isAvailable = await this.adapter.isAvailable();
      if (!isAvailable) {
        return {
          success: false,
          error: 'Storage adapter is not available',
          errorCode: STORAGE_SERVICE_ERROR_CODES.STORAGE_FAILED
        };
      }

      // Test storage operations
      const testResult = await this.adapter.testStorage();
      if (!testResult.success) {
        return {
          success: false,
          error: `Storage test failed: ${testResult.error}`,
          errorCode: STORAGE_SERVICE_ERROR_CODES.STORAGE_FAILED
        };
      }

      return {
        success: true,
        storageInfo: await this.adapter.getStorageInfo()
      };

    } catch (error) {
      console.error('StorageService initialization error:', error);
      return {
        success: false,
        error: `Initialization failed: ${error.message}`,
        errorCode: STORAGE_SERVICE_ERROR_CODES.STORAGE_FAILED
      };
    }
  }

  /**
   * Get tracking mode
   * @returns {Promise<Object>} Mode retrieval result
   */
  async getMode() {
    try {
      const result = await this.adapter.get(STORAGE_KEYS.MODE);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          errorCode: STORAGE_SERVICE_ERROR_CODES.RETRIEVAL_FAILED,
          data: DEFAULTS.MODE // Return default on error
        };
      }

      // Validate mode value
      const mode = result.data || DEFAULTS.MODE;
      const isValidMode = mode === MODES.SAVINGS || mode === MODES.DEBT;

      return {
        success: true,
        data: isValidMode ? mode : DEFAULTS.MODE
      };

    } catch (error) {
      console.error('StorageService.getMode error:', error);
      return {
        success: false,
        error: `Failed to get mode: ${error.message}`,
        errorCode: STORAGE_SERVICE_ERROR_CODES.RETRIEVAL_FAILED,
        data: DEFAULTS.MODE
      };
    }
  }

  /**
   * Set tracking mode
   * @param {string} mode - Mode to set (savings or debt)
   * @returns {Promise<Object>} Storage result
   */
  async setMode(mode) {
    try {
      // Validate mode
      if (mode !== MODES.SAVINGS && mode !== MODES.DEBT) {
        return {
          success: false,
          error: `Invalid mode: ${mode}. Must be '${MODES.SAVINGS}' or '${MODES.DEBT}'`,
          errorCode: STORAGE_SERVICE_ERROR_CODES.VALIDATION_FAILED
        };
      }

      const result = await this.adapter.set(STORAGE_KEYS.MODE, mode);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          errorCode: STORAGE_SERVICE_ERROR_CODES.STORAGE_FAILED
        };
      }

      return {
        success: true,
        data: mode
      };

    } catch (error) {
      console.error('StorageService.setMode error:', error);
      return {
        success: false,
        error: `Failed to set mode: ${error.message}`,
        errorCode: STORAGE_SERVICE_ERROR_CODES.STORAGE_FAILED
      };
    }
  }

  /**
   * Get goal amount
   * @returns {Promise<Object>} Goal retrieval result
   */
  async getGoal() {
    try {
      const result = await this.adapter.get(STORAGE_KEYS.GOAL);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          errorCode: STORAGE_SERVICE_ERROR_CODES.RETRIEVAL_FAILED,
          data: DEFAULTS.GOAL
        };
      }

      const goal = result.data || DEFAULTS.GOAL;

      // Validate goal value
      const validation = validateGoal(goal);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
          errorCode: STORAGE_SERVICE_ERROR_CODES.INVALID_DATA,
          data: DEFAULTS.GOAL
        };
      }

      return {
        success: true,
        data: validation.value
      };

    } catch (error) {
      console.error('StorageService.getGoal error:', error);
      return {
        success: false,
        error: `Failed to get goal: ${error.message}`,
        errorCode: STORAGE_SERVICE_ERROR_CODES.RETRIEVAL_FAILED,
        data: DEFAULTS.GOAL
      };
    }
  }

  /**
   * Set goal amount
   * @param {number} goal - Goal amount to set
   * @returns {Promise<Object>} Storage result
   */
  async setGoal(goal) {
    try {
      // Validate goal
      const validation = validateGoal(goal);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
          errorCode: STORAGE_SERVICE_ERROR_CODES.VALIDATION_FAILED
        };
      }

      const result = await this.adapter.set(STORAGE_KEYS.GOAL, validation.value);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          errorCode: STORAGE_SERVICE_ERROR_CODES.STORAGE_FAILED
        };
      }

      return {
        success: true,
        data: validation.value
      };

    } catch (error) {
      console.error('StorageService.setGoal error:', error);
      return {
        success: false,
        error: `Failed to set goal: ${error.message}`,
        errorCode: STORAGE_SERVICE_ERROR_CODES.STORAGE_FAILED
      };
    }
  }

  /**
   * Get transactions
   * @returns {Promise<Object>} Transactions retrieval result
   */
  async getTransactions() {
    try {
      const result = await this.adapter.get(STORAGE_KEYS.TRANSACTIONS);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          errorCode: STORAGE_SERVICE_ERROR_CODES.RETRIEVAL_FAILED,
          data: []
        };
      }

      const transactions = result.data || [];

      // Ensure it's an array
      if (!Array.isArray(transactions)) {
        return {
          success: false,
          error: 'Transactions data is corrupted (not an array)',
          errorCode: STORAGE_SERVICE_ERROR_CODES.INVALID_DATA,
          data: []
        };
      }

      // Validate each transaction structure
      const validTransactions = transactions.filter(transaction => {
        return transaction &&
               typeof transaction === 'object' &&
               typeof transaction.id !== 'undefined' &&
               typeof transaction.amount === 'number' &&
               typeof transaction.date === 'string';
      });

      return {
        success: true,
        data: validTransactions,
        filtered: validTransactions.length !== transactions.length
      };

    } catch (error) {
      console.error('StorageService.getTransactions error:', error);
      return {
        success: false,
        error: `Failed to get transactions: ${error.message}`,
        errorCode: STORAGE_SERVICE_ERROR_CODES.RETRIEVAL_FAILED,
        data: []
      };
    }
  }

  /**
   * Set transactions
   * @param {Array} transactions - Array of transaction objects
   * @returns {Promise<Object>} Storage result
   */
  async setTransactions(transactions) {
    try {
      // Validate input
      if (!Array.isArray(transactions)) {
        return {
          success: false,
          error: 'Transactions must be an array',
          errorCode: STORAGE_SERVICE_ERROR_CODES.VALIDATION_FAILED
        };
      }

      // Validate each transaction
      const validationErrors = [];
      const validatedTransactions = [];

      for (let i = 0; i < transactions.length; i++) {
        const transaction = transactions[i];

        // Basic structure validation
        if (!transaction || typeof transaction !== 'object') {
          validationErrors.push(`Transaction ${i}: Invalid transaction object`);
          continue;
        }

        // Required fields validation
        if (typeof transaction.id === 'undefined') {
          validationErrors.push(`Transaction ${i}: Missing id field`);
          continue;
        }

        if (typeof transaction.amount !== 'number') {
          validationErrors.push(`Transaction ${i}: Invalid amount field`);
          continue;
        }

        if (typeof transaction.date !== 'string') {
          validationErrors.push(`Transaction ${i}: Invalid date field`);
          continue;
        }

        validatedTransactions.push(transaction);
      }

      // If there are validation errors, return them
      if (validationErrors.length > 0) {
        return {
          success: false,
          error: `Transaction validation failed: ${validationErrors.join(', ')}`,
          errorCode: STORAGE_SERVICE_ERROR_CODES.VALIDATION_FAILED,
          validationErrors
        };
      }

      const result = await this.adapter.set(STORAGE_KEYS.TRANSACTIONS, validatedTransactions);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          errorCode: STORAGE_SERVICE_ERROR_CODES.STORAGE_FAILED
        };
      }

      return {
        success: true,
        data: validatedTransactions
      };

    } catch (error) {
      console.error('StorageService.setTransactions error:', error);
      return {
        success: false,
        error: `Failed to set transactions: ${error.message}`,
        errorCode: STORAGE_SERVICE_ERROR_CODES.STORAGE_FAILED
      };
    }
  }

  /**
   * Get interest rate
   * @returns {Promise<Object>} Interest rate retrieval result
   */
  async getInterestRate() {
    try {
      const result = await this.adapter.get(STORAGE_KEYS.INTEREST_RATE);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          errorCode: STORAGE_SERVICE_ERROR_CODES.RETRIEVAL_FAILED,
          data: DEFAULTS.INTEREST_RATE
        };
      }

      const rate = result.data || DEFAULTS.INTEREST_RATE;

      // Validate interest rate
      const validation = validateInterestRate(rate);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
          errorCode: STORAGE_SERVICE_ERROR_CODES.INVALID_DATA,
          data: DEFAULTS.INTEREST_RATE
        };
      }

      return {
        success: true,
        data: validation.value
      };

    } catch (error) {
      console.error('StorageService.getInterestRate error:', error);
      return {
        success: false,
        error: `Failed to get interest rate: ${error.message}`,
        errorCode: STORAGE_SERVICE_ERROR_CODES.RETRIEVAL_FAILED,
        data: DEFAULTS.INTEREST_RATE
      };
    }
  }

  /**
   * Set interest rate
   * @param {number} rate - Interest rate to set
   * @returns {Promise<Object>} Storage result
   */
  async setInterestRate(rate) {
    try {
      // Validate interest rate
      const validation = validateInterestRate(rate);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
          errorCode: STORAGE_SERVICE_ERROR_CODES.VALIDATION_FAILED
        };
      }

      const result = await this.adapter.set(STORAGE_KEYS.INTEREST_RATE, validation.value);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          errorCode: STORAGE_SERVICE_ERROR_CODES.STORAGE_FAILED
        };
      }

      return {
        success: true,
        data: validation.value
      };

    } catch (error) {
      console.error('StorageService.setInterestRate error:', error);
      return {
        success: false,
        error: `Failed to set interest rate: ${error.message}`,
        errorCode: STORAGE_SERVICE_ERROR_CODES.STORAGE_FAILED
      };
    }
  }

  /**
   * Get last interest date
   * @returns {Promise<Object>} Last interest date retrieval result
   */
  async getLastInterestDate() {
    try {
      const result = await this.adapter.get(STORAGE_KEYS.LAST_INTEREST_DATE);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          errorCode: STORAGE_SERVICE_ERROR_CODES.RETRIEVAL_FAILED,
          data: null
        };
      }

      return {
        success: true,
        data: result.data
      };

    } catch (error) {
      console.error('StorageService.getLastInterestDate error:', error);
      return {
        success: false,
        error: `Failed to get last interest date: ${error.message}`,
        errorCode: STORAGE_SERVICE_ERROR_CODES.RETRIEVAL_FAILED,
        data: null
      };
    }
  }

  /**
   * Set last interest date
   * @param {string|null} date - ISO date string or null
   * @returns {Promise<Object>} Storage result
   */
  async setLastInterestDate(date) {
    try {
      // Validate date format if provided
      if (date !== null && typeof date !== 'string') {
        return {
          success: false,
          error: 'Last interest date must be a string or null',
          errorCode: STORAGE_SERVICE_ERROR_CODES.VALIDATION_FAILED
        };
      }

      const result = await this.adapter.set(STORAGE_KEYS.LAST_INTEREST_DATE, date);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          errorCode: STORAGE_SERVICE_ERROR_CODES.STORAGE_FAILED
        };
      }

      return {
        success: true,
        data: date
      };

    } catch (error) {
      console.error('StorageService.setLastInterestDate error:', error);
      return {
        success: false,
        error: `Failed to set last interest date: ${error.message}`,
        errorCode: STORAGE_SERVICE_ERROR_CODES.STORAGE_FAILED
      };
    }
  }

  /**
   * Clear all application data
   * @returns {Promise<Object>} Clear operation result
   */
  async clearAll() {
    try {
      const appKeys = Object.values(STORAGE_KEYS);
      const result = await this.adapter.clearAppData(appKeys);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
          errorCode: STORAGE_SERVICE_ERROR_CODES.STORAGE_FAILED
        };
      }

      return {
        success: true,
        data: { clearedKeys: appKeys }
      };

    } catch (error) {
      console.error('StorageService.clearAll error:', error);
      return {
        success: false,
        error: `Failed to clear all data: ${error.message}`,
        errorCode: STORAGE_SERVICE_ERROR_CODES.STORAGE_FAILED
      };
    }
  }

  /**
   * Get all application data
   * @returns {Promise<Object>} All application data
   */
  async getAllAppData() {
    try {
      const [mode, goal, transactions, interestRate, lastInterestDate] = await Promise.all([
        this.getMode(),
        this.getGoal(),
        this.getTransactions(),
        this.getInterestRate(),
        this.getLastInterestDate()
      ]);

      return {
        success: true,
        data: {
          mode: mode.data,
          goal: goal.data,
          transactions: transactions.data,
          interestRate: interestRate.data,
          lastInterestDate: lastInterestDate.data
        },
        errors: {
          mode: mode.success ? null : mode.error,
          goal: goal.success ? null : goal.error,
          transactions: transactions.success ? null : transactions.error,
          interestRate: interestRate.success ? null : interestRate.error,
          lastInterestDate: lastInterestDate.success ? null : lastInterestDate.error
        }
      };

    } catch (error) {
      console.error('StorageService.getAllAppData error:', error);
      return {
        success: false,
        error: `Failed to get all app data: ${error.message}`,
        errorCode: STORAGE_SERVICE_ERROR_CODES.RETRIEVAL_FAILED
      };
    }
  }

  /**
   * Get storage service information
   * @returns {Promise<Object>} Service information
   */
  async getServiceInfo() {
    try {
      const storageInfo = await this.adapter.getStorageInfo();
      const appKeys = await this.adapter.getAppKeys();

      return {
        success: true,
        data: {
          storageInfo,
          appKeys,
          adapterType: this.adapter.constructor.name
        }
      };

    } catch (error) {
      console.error('StorageService.getServiceInfo error:', error);
      return {
        success: false,
        error: `Failed to get service info: ${error.message}`,
        errorCode: STORAGE_SERVICE_ERROR_CODES.RETRIEVAL_FAILED
      };
    }
  }
}

// Create and export singleton instance
export const storageService = new StorageService();

export default storageService;