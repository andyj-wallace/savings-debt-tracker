import { useState, useEffect, useRef } from 'react';
import { LocalStorageAdapter } from '../services/storage/LocalStorageAdapter';

// Shared storage adapter instance
let sharedAdapter = null;

/**
 * Get or create shared storage adapter instance
 * @returns {LocalStorageAdapter} Storage adapter instance
 */
const getStorageAdapter = () => {
  if (!sharedAdapter) {
    sharedAdapter = new LocalStorageAdapter();
  }
  return sharedAdapter;
};

/**
 * Custom hook for localStorage with storage adapter
 * @param {string} key - Storage key
 * @param {*} initialValue - Initial value if none exists
 * @param {Object} options - Hook options
 * @returns {Array} [value, setValue, error]
 */
export function useLocalStorage(key, initialValue, options = {}) {
  const {
    onError = null,
    retryAttempts = 3
  } = options;

  const adapter = useRef(getStorageAdapter());
  const [error, setError] = useState(null);

  // Initialize state with initial value, load from storage in effect
  const [value, setValue] = useState(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load initial value from storage
  useEffect(() => {
    let isCancelled = false;

    const loadInitialValue = async () => {
      try {
        const result = await adapter.current.get(key);

        if (!isCancelled) {
          if (result.success && result.data !== null) {
            setValue(result.data);
          }
          setIsLoaded(true);
        }
      } catch (err) {
        console.error(`Error loading ${key} from storage:`, err);
        if (!isCancelled) {
          setError(err.message);
          setIsLoaded(true);
          if (onError) onError(err);
        }
      }
    };

    loadInitialValue();

    return () => {
      isCancelled = true;
    };
  }, [key, onError]);

  // Effect to save value changes to storage (only after initial load)
  useEffect(() => {
    if (!isLoaded) return; // Don't save until we've loaded the initial value

    let isCancelled = false;

    const saveValue = async (attempt = 1) => {
      try {
        if (isCancelled) return;

        const result = await adapter.current.set(key, value);

        if (!result.success) {
          throw new Error(result.error);
        }

        // Clear any previous errors on successful save
        if (error && !isCancelled) {
          setError(null);
        }

      } catch (storageError) {
        console.error(`Error saving ${key} to storage (attempt ${attempt}):`, storageError);

        // Retry logic for transient errors
        if (attempt < retryAttempts &&
            (storageError.message?.includes('quota') === false)) {
          setTimeout(() => {
            if (!isCancelled) {
              saveValue(attempt + 1);
            }
          }, Math.pow(2, attempt) * 100); // Exponential backoff
          return;
        }

        // Set error state
        if (!isCancelled) {
          setError(storageError.message || 'Storage operation failed');

          // Call error handler if provided
          if (onError) {
            onError(storageError);
          }
        }
      }
    };

    // Save the value
    saveValue();

    // Cleanup function
    return () => {
      isCancelled = true;
    };
  }, [key, value, isLoaded, error, onError, retryAttempts]);

  // Enhanced setValue function with error handling
  const setValueWithErrorHandling = async (newValue) => {
    try {
      // If newValue is a function, call it with current value
      const valueToSet = typeof newValue === 'function' ? newValue(value) : newValue;
      setValue(valueToSet);
    } catch (error) {
      console.error(`Error setting value for ${key}:`, error);
      setError(error.message);
      if (onError) onError(error);
    }
  };

  return [value, setValueWithErrorHandling, error];
}

/**
 * Hook for storage operations with immediate async handling
 * @param {string} key - Storage key
 * @param {*} initialValue - Initial value
 * @param {Object} options - Hook options
 * @returns {Object} Storage operations object
 */
export function useStorageOperations(key, initialValue, options = {}) {
  const [value, setValue, error] = useLocalStorage(key, initialValue, options);
  const adapter = useRef(getStorageAdapter());

  const operations = {
    value,
    error,

    // Set value with immediate storage
    set: async (newValue) => {
      try {
        const valueToSet = typeof newValue === 'function' ? newValue(value) : newValue;
        const result = await adapter.current.set(key, valueToSet);

        if (result.success) {
          setValue(valueToSet);
          return { success: true, data: valueToSet };
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error(`Error in set operation for ${key}:`, error);
        return { success: false, error: error.message };
      }
    },

    // Get fresh value from storage
    refresh: async () => {
      try {
        const result = await adapter.current.get(key);
        if (result.success) {
          setValue(result.data || initialValue);
          return { success: true, data: result.data };
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error(`Error in refresh operation for ${key}:`, error);
        return { success: false, error: error.message };
      }
    },

    // Remove value from storage
    remove: async () => {
      try {
        const result = await adapter.current.remove(key);
        if (result.success) {
          setValue(initialValue);
          return { success: true };
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error(`Error in remove operation for ${key}:`, error);
        return { success: false, error: error.message };
      }
    }
  };

  return operations;
}

export default useLocalStorage;