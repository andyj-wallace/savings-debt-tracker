/**
 * LocalStorageAdapter Implementation
 *
 * Concrete implementation of StorageAdapter that uses browser localStorage
 * as the storage backend. Includes comprehensive error handling for
 * quota exceeded, permission denied, and parse failures.
 *
 * @fileoverview localStorage implementation of StorageAdapter
 */

import { StorageAdapter, STORAGE_ERROR_CODES } from './StorageAdapter';

/**
 * LocalStorageAdapter class
 * Implements the StorageAdapter interface using browser localStorage
 */
export class LocalStorageAdapter extends StorageAdapter {
  private storage: Storage | null;

  constructor() {
    super();
    this.storage = typeof window !== 'undefined' ? window.localStorage : null;
  }

  /**
   * Check if localStorage is available
   * @returns {Promise<boolean>} Whether localStorage is available
   */
  async isAvailable() {
    try {
      if (!this.storage) {
        return false;
      }

      // Test storage by trying to set and remove a test key
      const testKey = '__storage_test__';
      this.storage.setItem(testKey, 'test');
      this.storage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get a value from localStorage
   * @param {string} key - Storage key
   * @returns {Promise<StorageResult>} Storage operation result
   */
  async get(key) {
    try {
      // Validate inputs
      if (!this._isValidKey(key)) {
        return this._createErrorResult(
          'Invalid storage key provided',
          STORAGE_ERROR_CODES.INVALID_KEY
        );
      }

      // Check if storage is available
      if (!(await this.isAvailable())) {
        return this._createErrorResult(
          'localStorage is not available',
          STORAGE_ERROR_CODES.STORAGE_UNAVAILABLE
        );
      }

      // Get value from storage
      const rawValue = this.storage.getItem(key);

      // Handle null/missing values
      if (rawValue === null) {
        return this._createSuccessResult(null);
      }

      // Deserialize the value
      const deserializationResult = this._deserializeValue(rawValue);
      if (!deserializationResult.success) {
        return this._createErrorResult(
          deserializationResult.error,
          deserializationResult.errorCode
        );
      }

      return this._createSuccessResult(deserializationResult.data);

    } catch (error) {
      console.error('LocalStorageAdapter.get error:', error);
      return this._handleStorageError(error);
    }
  }

  /**
   * Set a value in localStorage
   * @param {string} key - Storage key
   * @param {*} value - Value to store
   * @returns {Promise<StorageResult>} Storage operation result
   */
  async set(key, value) {
    try {
      // Validate inputs
      if (!this._isValidKey(key)) {
        return this._createErrorResult(
          'Invalid storage key provided',
          STORAGE_ERROR_CODES.INVALID_KEY
        );
      }

      // Check if storage is available
      if (!(await this.isAvailable())) {
        return this._createErrorResult(
          'localStorage is not available',
          STORAGE_ERROR_CODES.STORAGE_UNAVAILABLE
        );
      }

      // Serialize the value
      const serializationResult = this._serializeValue(value);
      if (!serializationResult.success) {
        return this._createErrorResult(
          serializationResult.error,
          serializationResult.errorCode
        );
      }

      // Handle null values - remove from storage
      if (value === null || value === undefined) {
        return await this.remove(key);
      }

      // Set value in storage
      this.storage.setItem(key, serializationResult.data);

      return this._createSuccessResult(value);

    } catch (error) {
      console.error('LocalStorageAdapter.set error:', error);
      return this._handleStorageError(error);
    }
  }

  /**
   * Remove a value from localStorage
   * @param {string} key - Storage key
   * @returns {Promise<StorageResult>} Storage operation result
   */
  async remove(key) {
    try {
      // Validate inputs
      if (!this._isValidKey(key)) {
        return this._createErrorResult(
          'Invalid storage key provided',
          STORAGE_ERROR_CODES.INVALID_KEY
        );
      }

      // Check if storage is available
      if (!(await this.isAvailable())) {
        return this._createErrorResult(
          'localStorage is not available',
          STORAGE_ERROR_CODES.STORAGE_UNAVAILABLE
        );
      }

      // Remove value from storage
      this.storage.removeItem(key);

      return this._createSuccessResult(true);

    } catch (error) {
      console.error('LocalStorageAdapter.remove error:', error);
      return this._handleStorageError(error);
    }
  }

  /**
   * Clear all values from localStorage
   * Note: This clears ALL localStorage, not just app-specific keys
   * @returns {Promise<StorageResult>} Storage operation result
   */
  async clear() {
    try {
      // Check if storage is available
      if (!(await this.isAvailable())) {
        return this._createErrorResult(
          'localStorage is not available',
          STORAGE_ERROR_CODES.STORAGE_UNAVAILABLE
        );
      }

      // Clear all storage
      this.storage.clear();

      return this._createSuccessResult(true);

    } catch (error) {
      console.error('LocalStorageAdapter.clear error:', error);
      return this._handleStorageError(error);
    }
  }

  /**
   * Clear only app-specific keys from localStorage
   * @param {string[]} appKeys - Array of app-specific keys to clear
   * @returns {Promise<StorageResult>} Storage operation result
   */
  async clearAppData(appKeys = []) {
    try {
      // Check if storage is available
      if (!(await this.isAvailable())) {
        return this._createErrorResult(
          'localStorage is not available',
          STORAGE_ERROR_CODES.STORAGE_UNAVAILABLE
        );
      }

      const results = [];
      for (const key of appKeys) {
        const result = await this.remove(key);
        results.push({ key, success: result.success, error: result.error });
      }

      const failedRemovals = results.filter(r => !r.success);
      if (failedRemovals.length > 0) {
        return this._createErrorResult(
          `Failed to remove ${failedRemovals.length} keys`,
          STORAGE_ERROR_CODES.UNKNOWN_ERROR,
          { failedRemovals }
        );
      }

      return this._createSuccessResult({ removedKeys: appKeys.length });

    } catch (error) {
      console.error('LocalStorageAdapter.clearAppData error:', error);
      return this._handleStorageError(error);
    }
  }

  /**
   * Get all keys from localStorage
   * @returns {Promise<string[]>} Array of storage keys
   */
  async getAllKeys() {
    try {
      // Check if storage is available
      if (!(await this.isAvailable())) {
        return [];
      }

      const keys = [];
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key) {
          keys.push(key);
        }
      }

      return keys;

    } catch (error) {
      console.error('LocalStorageAdapter.getAllKeys error:', error);
      return [];
    }
  }

  /**
   * Get app-specific keys from localStorage
   * @param {string} keyPrefix - Prefix to filter keys (e.g., 'tracker')
   * @returns {Promise<string[]>} Array of app-specific storage keys
   */
  async getAppKeys(keyPrefix = 'tracker') {
    try {
      const allKeys = await this.getAllKeys();
      return allKeys.filter(key => key.startsWith(keyPrefix));
    } catch (error) {
      console.error('LocalStorageAdapter.getAppKeys error:', error);
      return [];
    }
  }

  /**
   * Get storage size information
   * @returns {Promise<Object>} Storage size information
   */
  async getStorageInfo() {
    try {
      // Check if storage is available
      if (!(await this.isAvailable())) {
        return {
          available: false,
          totalSize: 0,
          usedSize: 0,
          keyCount: 0
        };
      }

      let usedSize = 0;
      let keyCount = 0;

      // Calculate used storage size
      for (let i = 0; i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key) {
          const value = this.storage.getItem(key);
          usedSize += key.length + (value ? value.length : 0);
          keyCount++;
        }
      }

      // Estimate total available size (localStorage is typically 5-10MB)
      // This is an approximation as there's no standard way to get quota
      const estimatedTotalSize = 5 * 1024 * 1024; // 5MB

      return {
        available: true,
        totalSize: estimatedTotalSize,
        usedSize,
        keyCount,
        percentageUsed: (usedSize / estimatedTotalSize) * 100
      };

    } catch (error) {
      console.error('LocalStorageAdapter.getStorageInfo error:', error);
      return {
        available: false,
        totalSize: 0,
        usedSize: 0,
        keyCount: 0,
        error: error.message
      };
    }
  }

  /**
   * Test storage with retry logic
   * @param {number} maxRetries - Maximum number of retries
   * @returns {Promise<StorageResult>} Test result
   */
  async testStorage(maxRetries = 3) {
    const testKey = '__storage_test_' + Date.now();
    const testValue = { test: true, timestamp: Date.now() };

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Test set operation
        const setResult = await this.set(testKey, testValue);
        if (!setResult.success) {
          if (attempt === maxRetries) {
            return setResult;
          }
          continue;
        }

        // Test get operation
        const getResult = await this.get(testKey);
        if (!getResult.success) {
          if (attempt === maxRetries) {
            return getResult;
          }
          continue;
        }

        // Verify data integrity
        const retrievedValue = getResult.data;
        if (JSON.stringify(retrievedValue) !== JSON.stringify(testValue)) {
          if (attempt === maxRetries) {
            return this._createErrorResult(
              'Data integrity check failed',
              STORAGE_ERROR_CODES.UNKNOWN_ERROR
            );
          }
          continue;
        }

        // Test remove operation
        const removeResult = await this.remove(testKey);
        if (!removeResult.success) {
          if (attempt === maxRetries) {
            return removeResult;
          }
          continue;
        }

        // All tests passed
        return this._createSuccessResult({
          success: true,
          attempts: attempt,
          operations: ['set', 'get', 'remove']
        });

      } catch (error) {
        console.error(`LocalStorageAdapter.testStorage attempt ${attempt} error:`, error);

        // Clean up test key on error
        try {
          await this.remove(testKey);
        } catch (cleanupError) {
          console.error('Failed to clean up test key:', cleanupError);
        }

        if (attempt === maxRetries) {
          return this._handleStorageError(error);
        }
      }
    }

    return this._createErrorResult(
      'Storage test failed after maximum retries',
      STORAGE_ERROR_CODES.UNKNOWN_ERROR
    );
  }
}

export default LocalStorageAdapter;