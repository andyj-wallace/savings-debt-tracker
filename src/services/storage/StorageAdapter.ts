/**
 * StorageAdapter Abstract Class
 *
 * Defines the interface for all storage adapters in the application.
 * This abstraction allows for easy swapping of storage backends
 * (localStorage, sessionStorage, IndexedDB, API, etc.) without
 * changing the application logic.
 *
 * @fileoverview Abstract storage adapter interface
 */

/**
 * Storage operation result structure
 * @typedef {Object} StorageResult
 * @property {boolean} success - Whether the operation succeeded
 * @property {*} data - The retrieved/stored data (for get operations)
 * @property {string|null} error - Error message if operation failed
 * @property {string} errorCode - Error code for programmatic handling
 */

/**
 * Storage error codes for consistent error handling
 */
export const STORAGE_ERROR_CODES = {
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  PARSE_ERROR: 'PARSE_ERROR',
  SERIALIZATION_ERROR: 'SERIALIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  STORAGE_UNAVAILABLE: 'STORAGE_UNAVAILABLE',
  INVALID_KEY: 'INVALID_KEY',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

/**
 * Storage result interface
 */
export interface StorageResult {
  success: boolean;
  data: unknown;
  error: string | null;
  errorCode: string | null;
}

/**
 * Abstract StorageAdapter class
 * All storage adapters must extend this class and implement its methods
 */
export class StorageAdapter {
  /**
   * Get a value from storage
   * @param {string} key - Storage key
   * @returns {Promise<StorageResult>} Storage operation result
   * @abstract
   */
  async get(key: string): Promise<StorageResult> {
    throw new Error('StorageAdapter.get() must be implemented by subclass');
  }

  /**
   * Set a value in storage
   * @param {string} key - Storage key
   * @param {*} value - Value to store
   * @returns {Promise<StorageResult>} Storage operation result
   * @abstract
   */
  async set(key: string, value: unknown): Promise<StorageResult> {
    throw new Error('StorageAdapter.set() must be implemented by subclass');
  }

  /**
   * Remove a value from storage
   * @param {string} key - Storage key
   * @returns {Promise<StorageResult>} Storage operation result
   * @abstract
   */
  async remove(key: string): Promise<StorageResult> {
    throw new Error('StorageAdapter.remove() must be implemented by subclass');
  }

  /**
   * Clear all values from storage
   * @returns {Promise<StorageResult>} Storage operation result
   * @abstract
   */
  async clear(): Promise<StorageResult> {
    throw new Error('StorageAdapter.clear() must be implemented by subclass');
  }

  /**
   * Check if storage is available
   * @returns {Promise<boolean>} Whether storage is available
   * @abstract
   */
  async isAvailable(): Promise<boolean> {
    throw new Error('StorageAdapter.isAvailable() must be implemented by subclass');
  }

  /**
   * Get all keys from storage
   * @returns {Promise<string[]>} Array of storage keys
   * @abstract
   */
  async getAllKeys(): Promise<string[]> {
    throw new Error('StorageAdapter.getAllKeys() must be implemented by subclass');
  }

  /**
   * Get storage size information
   * @returns {Promise<Object>} Storage size information
   * @abstract
   */
  async getStorageInfo(): Promise<unknown> {
    throw new Error('StorageAdapter.getStorageInfo() must be implemented by subclass');
  }

  /**
   * Get all application keys from storage
   * @returns {Promise<string[]>} Array of app-specific storage keys
   * @abstract
   */
  async getAppKeys(): Promise<string[]> {
    throw new Error('StorageAdapter.getAppKeys() must be implemented by subclass');
  }

  /**
   * Helper method to create a success result
   * @param {*} data - The data to return
   * @returns {StorageResult} Success result object
   * @protected
   */
  _createSuccessResult(data = null) {
    return {
      success: true,
      data,
      error: null,
      errorCode: null
    };
  }

  /**
   * Helper method to create an error result
   * @param {string} error - Error message
   * @param {string} errorCode - Error code
   * @param {*} data - Optional data to include
   * @returns {StorageResult} Error result object
   * @protected
   */
  _createErrorResult(error, errorCode = STORAGE_ERROR_CODES.UNKNOWN_ERROR, data = null) {
    return {
      success: false,
      data,
      error,
      errorCode
    };
  }

  /**
   * Helper method to validate storage key
   * @param {string} key - Storage key to validate
   * @returns {boolean} Whether the key is valid
   * @protected
   */
  _isValidKey(key) {
    return typeof key === 'string' && key.length > 0 && key.trim() !== '';
  }

  /**
   * Helper method to safely serialize data for storage
   * @param {*} value - Value to serialize
   * @returns {Object} Serialization result
   * @protected
   */
  _serializeValue(value) {
    try {
      if (value === null || value === undefined) {
        return { success: true, data: null };
      }

      if (typeof value === 'string') {
        return { success: true, data: value };
      }

      if (typeof value === 'number' || typeof value === 'boolean') {
        return { success: true, data: value.toString() };
      }

      // Objects and arrays - serialize to JSON
      const serialized = JSON.stringify(value);
      return { success: true, data: serialized };

    } catch (error) {
      return {
        success: false,
        error: `Failed to serialize value: ${error.message}`,
        errorCode: STORAGE_ERROR_CODES.SERIALIZATION_ERROR
      };
    }
  }

  /**
   * Helper method to safely deserialize data from storage
   * @param {string} serializedValue - Serialized value from storage
   * @returns {Object} Deserialization result
   * @protected
   */
  _deserializeValue(serializedValue) {
    try {
      if (serializedValue === null || serializedValue === undefined) {
        return { success: true, data: null };
      }

      if (typeof serializedValue !== 'string') {
        return { success: true, data: serializedValue };
      }

      // Try to parse as JSON first
      try {
        const parsed = JSON.parse(serializedValue);
        return { success: true, data: parsed };
      } catch {
        // If JSON parse fails, return as string
        return { success: true, data: serializedValue };
      }

    } catch (error) {
      return {
        success: false,
        error: `Failed to deserialize value: ${error.message}`,
        errorCode: STORAGE_ERROR_CODES.PARSE_ERROR
      };
    }
  }

  /**
   * Helper method to handle common storage errors
   * @param {Error} error - The caught error
   * @returns {StorageResult} Error result with appropriate error code
   * @protected
   */
  _handleStorageError(error) {
    // Quota exceeded error
    if (error.name === 'QuotaExceededError' ||
        error.code === 22 ||
        error.message?.includes('quota') ||
        error.message?.includes('storage full')) {
      return this._createErrorResult(
        'Storage quota exceeded. Please clear some data or use a different browser.',
        STORAGE_ERROR_CODES.QUOTA_EXCEEDED
      );
    }

    // Permission denied error
    if (error.name === 'SecurityError' ||
        error.message?.includes('permission') ||
        error.message?.includes('access denied')) {
      return this._createErrorResult(
        'Storage access denied. Please check browser settings.',
        STORAGE_ERROR_CODES.PERMISSION_DENIED
      );
    }

    // Storage unavailable error
    if (error.message?.includes('not available') ||
        error.message?.includes('disabled')) {
      return this._createErrorResult(
        'Storage is not available or disabled.',
        STORAGE_ERROR_CODES.STORAGE_UNAVAILABLE
      );
    }

    // Generic error
    return this._createErrorResult(
      `Storage operation failed: ${error.message}`,
      STORAGE_ERROR_CODES.UNKNOWN_ERROR
    );
  }
}

export default StorageAdapter;