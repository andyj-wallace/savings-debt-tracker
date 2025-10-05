import { useState, useEffect } from 'react';

export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      
      if (saved === null || saved === undefined) {
        return initialValue;
      }

      // Try to parse as JSON first (for arrays/objects)
      try {
        const parsed = JSON.parse(saved);
        return parsed;
      } catch {
        // If JSON parse fails, check if it should be a number
        if (key.includes('Goal') || key.includes('Current') || key.includes('Rate')) {
          const num = parseFloat(saved);
          return isNaN(num) ? initialValue : num;
        }
        return saved;
      }
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      if (value === null || value === undefined) {
        localStorage.removeItem(key);
      } else if (typeof value === 'object') {
        localStorage.setItem(key, JSON.stringify(value));
      } else {
        localStorage.setItem(key, value.toString());
      }
    } catch (error) {
      console.error(`Error saving ${key} to localStorage:`, error);
    }
  }, [key, value]);

  return [value, setValue];
}