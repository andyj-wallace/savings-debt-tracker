/**
 * Interest Calculator Tests
 *
 * Unit tests for interest calculation utility functions.
 * Tests interest calculations, date functions, and pending interest logic.
 */

import {
  calculateInterest,
  daysBetween,
  getDaysSinceLastTransaction,
  calculatePendingInterest,
  shouldApplyInterest,
  createInterestCalculation
} from '../interestCalculator';
import type { Transaction } from '../../types';

describe('interestCalculator', () => {
  describe('calculateInterest', () => {
    test('should return 0 for zero or negative balance', () => {
      expect(calculateInterest(0, 18.99, 30)).toBe(0);
      expect(calculateInterest(-100, 18.99, 30)).toBe(0);
    });

    test('should return 0 for zero or negative rate', () => {
      expect(calculateInterest(1000, 0, 30)).toBe(0);
      expect(calculateInterest(1000, -5, 30)).toBe(0);
    });

    test('should calculate daily interest correctly', () => {
      // $1000 at 18.99% APR for 30 days (daily compounding)
      // Daily rate = 18.99% / 365 = 0.052027...%
      // Interest = 1000 * 0.0520274 * 30 = ~$15.61
      const interest = calculateInterest(1000, 18.99, 30);
      expect(interest).toBeGreaterThan(0);
      expect(interest).toBeLessThan(20); // Sanity check
    });

    test('should use 30 days as default', () => {
      const interestDefault = calculateInterest(1000, 18.99);
      const interest30 = calculateInterest(1000, 18.99, 30);
      expect(interestDefault).toBe(interest30);
    });

    test('should scale with balance', () => {
      const interest1000 = calculateInterest(1000, 18.99, 30);
      const interest2000 = calculateInterest(2000, 18.99, 30);
      expect(interest2000).toBeCloseTo(interest1000 * 2, 1);
    });

    test('should scale with days', () => {
      const interest30 = calculateInterest(1000, 18.99, 30);
      const interest60 = calculateInterest(1000, 18.99, 60);
      expect(interest60).toBeCloseTo(interest30 * 2, 1);
    });

    test('should scale with rate', () => {
      const interest10 = calculateInterest(1000, 10, 30);
      const interest20 = calculateInterest(1000, 20, 30);
      expect(interest20).toBeCloseTo(interest10 * 2, 1);
    });
  });

  describe('daysBetween', () => {
    test('should calculate days between two dates', () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-01-31');
      expect(daysBetween(date1, date2)).toBe(30);
    });

    test('should handle string dates', () => {
      expect(daysBetween('2024-01-01', '2024-01-31')).toBe(30);
    });

    test('should handle reversed dates (absolute value)', () => {
      const date1 = new Date('2024-01-31');
      const date2 = new Date('2024-01-01');
      expect(daysBetween(date1, date2)).toBe(30);
    });

    test('should return 0 for same date', () => {
      const date = new Date('2024-01-15');
      expect(daysBetween(date, date)).toBe(0);
    });

    test('should handle dates across months', () => {
      expect(daysBetween('2024-01-15', '2024-03-15')).toBe(60);
    });

    test('should handle dates across years', () => {
      expect(daysBetween('2023-12-31', '2024-01-01')).toBe(1);
    });
  });

  describe('getDaysSinceLastTransaction', () => {
    test('should return 30 for empty transactions array', () => {
      expect(getDaysSinceLastTransaction([])).toBe(30);
    });

    test('should calculate days from last transaction', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const transactions: Transaction[] = [
        {
          id: '1',
          amount: 100,
          date: yesterday.toISOString(),
          type: 'transaction',
          runningTotal: 100,
          note: 'Test'
        }
      ];

      const days = getDaysSinceLastTransaction(transactions);
      expect(days).toBeGreaterThanOrEqual(1);
      expect(days).toBeLessThanOrEqual(2);
    });

    test('should use the last transaction in the array', () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const transactions: Transaction[] = [
        {
          id: '1',
          amount: 100,
          date: weekAgo.toISOString(),
          type: 'transaction',
          runningTotal: 100,
          note: 'Test'
        },
        {
          id: '2',
          amount: 200,
          date: yesterday.toISOString(),
          type: 'transaction',
          runningTotal: 300,
          note: 'Test'
        }
      ];

      const days = getDaysSinceLastTransaction(transactions);
      expect(days).toBeLessThanOrEqual(2); // Should use yesterday, not week ago
    });
  });

  describe('calculatePendingInterest', () => {
    test('should return 0 for zero or negative balance', () => {
      const result = calculatePendingInterest(0, 18.99, new Date());
      expect(result.pendingInterest).toBe(0);
      expect(result.daysPending).toBe(0);
    });

    test('should return 0 for null lastChargeDate', () => {
      const result = calculatePendingInterest(1000, 18.99, null);
      expect(result.pendingInterest).toBe(0);
      expect(result.daysPending).toBe(0);
    });

    test('should calculate pending interest correctly', () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = calculatePendingInterest(1000, 18.99, thirtyDaysAgo);
      expect(result.daysPending).toBeGreaterThanOrEqual(30);
      expect(result.pendingInterest).toBeGreaterThan(0);
    });

    test('should handle string date', () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = calculatePendingInterest(1000, 18.99, thirtyDaysAgo.toISOString());
      expect(result.daysPending).toBeGreaterThanOrEqual(30);
      expect(result.pendingInterest).toBeGreaterThan(0);
    });
  });

  describe('shouldApplyInterest', () => {
    test('should return true for null lastChargeDate', () => {
      expect(shouldApplyInterest(null)).toBe(true);
    });

    test('should return true after threshold days', () => {
      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

      expect(shouldApplyInterest(thirtyOneDaysAgo)).toBe(true);
    });

    test('should return false before threshold days', () => {
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      expect(shouldApplyInterest(tenDaysAgo)).toBe(false);
    });

    test('should respect custom threshold', () => {
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

      // Default threshold is 30, so should be false
      expect(shouldApplyInterest(fifteenDaysAgo)).toBe(false);

      // With custom threshold of 10, should be true
      expect(shouldApplyInterest(fifteenDaysAgo, 10)).toBe(true);
    });

    test('should handle string date', () => {
      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

      expect(shouldApplyInterest(thirtyOneDaysAgo.toISOString())).toBe(true);
    });
  });

  describe('createInterestCalculation', () => {
    test('should create complete interest calculation object', () => {
      const result = createInterestCalculation(1000, 18.99, 30);

      expect(result.principal).toBe(1000);
      expect(result.rate).toBe(18.99);
      expect(result.days).toBe(30);
      expect(result.interest).toBeGreaterThan(0);
      expect(result.compoundingFrequency).toBeDefined();
    });

    test('should use 30 days as default', () => {
      const result = createInterestCalculation(1000, 18.99);
      expect(result.days).toBe(30);
    });

    test('should handle zero balance', () => {
      const result = createInterestCalculation(0, 18.99, 30);
      expect(result.interest).toBe(0);
    });
  });
});
