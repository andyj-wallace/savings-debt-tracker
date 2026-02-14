/**
 * Migration Service
 *
 * Story 9.1: One-Time LocalStorage Migration
 * Reads localStorage data and migrates it to the API backend.
 *
 * @fileoverview LocalStorage to API migration utilities
 */

import { apiClient } from './apiClient';
import { STORAGE_KEYS } from '../constants';
import type { Transaction, Mode, CreateTrackerRequest, CreateEntryRequest } from '../types';

export interface MigrationResult {
  success: boolean;
  trackerCreated: boolean;
  entriesMigrated: number;
  entriesFailed: number;
  errors: string[];
}

/**
 * Check if there is localStorage data to migrate.
 * Returns true if any tracker-related keys have data.
 */
export function hasLocalStorageData(): boolean {
  try {
    const mode = localStorage.getItem(STORAGE_KEYS.MODE);
    const goal = localStorage.getItem(STORAGE_KEYS.GOAL);
    const transactions = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);

    // Need at least mode or goal to have meaningful data
    return !!(mode || goal || transactions);
  } catch {
    return false;
  }
}

/**
 * Read all localStorage data into a snapshot.
 */
function getLocalStorageSnapshot() {
  const modeRaw = localStorage.getItem(STORAGE_KEYS.MODE);
  const goalRaw = localStorage.getItem(STORAGE_KEYS.GOAL);
  const transactionsRaw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
  const interestRateRaw = localStorage.getItem(STORAGE_KEYS.INTEREST_RATE);
  const lastInterestDateRaw = localStorage.getItem(STORAGE_KEYS.LAST_INTEREST_DATE);

  const mode: Mode = modeRaw ? JSON.parse(modeRaw) : 'savings';
  const goal: number = goalRaw ? JSON.parse(goalRaw) : 0;
  const transactions: Transaction[] = transactionsRaw ? JSON.parse(transactionsRaw) : [];
  const interestRate: number | undefined = interestRateRaw ? JSON.parse(interestRateRaw) : undefined;
  const lastInterestDate: string | null = lastInterestDateRaw ? JSON.parse(lastInterestDateRaw) : null;

  return { mode, goal, transactions, interestRate, lastInterestDate };
}

/**
 * Migrate localStorage data to the API backend.
 *
 * 1. Creates a tracker via the API
 * 2. Submits entries in chronological order (oldest first)
 * 3. Updates lastInterestDate if present
 */
export async function migrateToApi(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    trackerCreated: false,
    entriesMigrated: 0,
    entriesFailed: 0,
    errors: [],
  };

  try {
    const snapshot = getLocalStorageSnapshot();

    if (!snapshot.goal && snapshot.transactions.length === 0) {
      result.errors.push('No data to migrate');
      return result;
    }

    // Create tracker — localStorage amounts are in dollars, API expects cents
    const trackerInput: CreateTrackerRequest = {
      name: snapshot.mode === 'debt' ? 'Debt Payoff' : 'Savings Goal',
      mode: snapshot.mode,
      goalAmount: Math.round(snapshot.goal * 100),
    };

    if (snapshot.interestRate !== undefined && snapshot.interestRate > 0) {
      trackerInput.interestRate = snapshot.interestRate;
    }

    const trackerResult = await apiClient.createTracker(trackerInput);

    if (!trackerResult.success || !trackerResult.data) {
      result.errors.push(`Failed to create tracker: ${trackerResult.error}`);
      return result;
    }

    result.trackerCreated = true;
    const trackerId = trackerResult.data.trackerId;

    // Sort transactions chronologically (oldest first) so running totals build correctly
    const sortedTransactions = [...snapshot.transactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Submit entries sequentially to maintain order
    for (const tx of sortedTransactions) {
      const entryInput: CreateEntryRequest = {
        amount: Math.round(tx.amount * 100), // dollars → cents
        type: tx.type,
      };

      if (tx.note) {
        entryInput.note = tx.note;
      }

      if (tx.type === 'interest' && tx.days) {
        entryInput.days = tx.days;
      }

      const entryResult = await apiClient.createEntry(trackerId, entryInput);

      if (entryResult.success) {
        result.entriesMigrated++;
      } else {
        result.entriesFailed++;
        result.errors.push(`Entry failed: ${entryResult.error}`);
      }
    }

    // Update lastInterestDate if present
    if (snapshot.lastInterestDate) {
      await apiClient.updateTracker(trackerId, {
        lastInterestDate: snapshot.lastInterestDate,
      });
    }

    result.success = result.entriesFailed === 0;
    return result;
  } catch (err) {
    result.errors.push(err instanceof Error ? err.message : 'Unknown error');
    return result;
  }
}

/**
 * Clear debt-tracker localStorage keys after successful migration.
 */
export function clearLocalStorageData(): void {
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
}
