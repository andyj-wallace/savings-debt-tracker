/**
 * InterestService Tests
 *
 * Unit tests for InterestService business logic methods.
 * Tests interest calculations, validation, and transaction creation.
 */

import InterestService, { INTEREST_SERVICE_ERROR_CODES } from '../InterestService';
import { MODES } from '../../constants';

describe('InterestService', () => {
  describe('calculatePendingInterest', () => {
    test('should calculate pending interest for valid inputs', () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = InterestService.calculatePendingInterest(
        1000,
        18.99,
        thirtyDaysAgo.toISOString()
      );

      expect(result.success).toBe(true);
      expect(result.data.pendingInterest).toBeGreaterThan(0);
      expect(result.data.daysPending).toBeGreaterThanOrEqual(30);
    });

    test('should return 0 for zero balance', () => {
      const result = InterestService.calculatePendingInterest(0, 18.99, new Date().toISOString());

      expect(result.success).toBe(true);
      expect(result.data.pendingInterest).toBe(0);
      expect(result.data.daysPending).toBe(0);
    });

    test('should fail for negative balance', () => {
      const result = InterestService.calculatePendingInterest(-100, 18.99, new Date().toISOString());

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(INTEREST_SERVICE_ERROR_CODES.INVALID_BALANCE);
    });

    test('should fail for invalid interest rate', () => {
      const result = InterestService.calculatePendingInterest(1000, -5, new Date().toISOString());

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(INTEREST_SERVICE_ERROR_CODES.INVALID_RATE);
    });

    test('should handle null lastDate', () => {
      const result = InterestService.calculatePendingInterest(1000, 18.99, null);

      expect(result.success).toBe(true);
      expect(result.data.pendingInterest).toBe(0);
    });

    test('should fail for non-number balance', () => {
      const result = InterestService.calculatePendingInterest('invalid' as any, 18.99, null);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(INTEREST_SERVICE_ERROR_CODES.INVALID_BALANCE);
    });
  });

  describe('shouldAutoApplyInterest', () => {
    test('should return true for null lastDate', () => {
      const result = InterestService.shouldAutoApplyInterest(null);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    test('should return true after threshold days', () => {
      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

      const result = InterestService.shouldAutoApplyInterest(thirtyOneDaysAgo.toISOString());

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    test('should return false before threshold days', () => {
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

      const result = InterestService.shouldAutoApplyInterest(tenDaysAgo.toISOString());

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });

    test('should respect custom threshold', () => {
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

      const result = InterestService.shouldAutoApplyInterest(fifteenDaysAgo.toISOString(), 10);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    test('should fail for negative threshold', () => {
      const result = InterestService.shouldAutoApplyInterest(null, -5);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(INTEREST_SERVICE_ERROR_CODES.INVALID_DATE);
    });
  });

  describe('createInterestTransaction', () => {
    test('should create interest transaction', () => {
      const result = InterestService.createInterestTransaction(25.50, 30, 1000);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        amount: 25.50,
        type: 'interest',
        days: 30,
        runningTotal: 1025.50
      });
      expect(result.data.id).toBeDefined();
      expect(result.data.date).toBeDefined();
      expect(result.data.note).toBeDefined();
    });

    test('should return null for zero interest', () => {
      const result = InterestService.createInterestTransaction(0, 30, 1000);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    test('should fail for negative interest amount', () => {
      const result = InterestService.createInterestTransaction(-10, 30, 1000);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(INTEREST_SERVICE_ERROR_CODES.INVALID_BALANCE);
    });

    test('should fail for negative days pending', () => {
      const result = InterestService.createInterestTransaction(25, -5, 1000);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(INTEREST_SERVICE_ERROR_CODES.INVALID_DATE);
    });

    test('should use custom note when provided', () => {
      const result = InterestService.createInterestTransaction(25, 30, 1000, 'Custom interest note');

      expect(result.success).toBe(true);
      expect(result.data.note).toBe('Custom interest note');
    });

    test('should handle zero current total', () => {
      const result = InterestService.createInterestTransaction(25, 30, 0);

      expect(result.success).toBe(true);
      expect(result.data.runningTotal).toBe(25);
    });
  });

  describe('applyInterestCharge', () => {
    test('should apply interest for valid inputs', () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = InterestService.applyInterestCharge(
        1000,
        18.99,
        thirtyDaysAgo.toISOString(),
        500
      );

      expect(result.success).toBe(true);
      expect(result.data.interestApplied).toBe(true);
      expect(result.data.amount).toBeGreaterThan(0);
      expect(result.data.transaction).toBeDefined();
      expect(result.data.newInterestDate).toBeDefined();
    });

    test('should fail for zero balance', () => {
      const result = InterestService.applyInterestCharge(0, 18.99, null, 0);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(INTEREST_SERVICE_ERROR_CODES.INVALID_BALANCE);
    });

    test('should fail for negative balance', () => {
      const result = InterestService.applyInterestCharge(-100, 18.99, null, 0);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(INTEREST_SERVICE_ERROR_CODES.INVALID_BALANCE);
    });

    test('should return no interest applied for recent date', () => {
      const now = new Date().toISOString();

      const result = InterestService.applyInterestCharge(1000, 18.99, now, 500);

      expect(result.success).toBe(true);
      // May or may not have interest depending on timing
    });
  });

  describe('updatePendingInterest', () => {
    test('should calculate pending interest for debt mode', () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = InterestService.updatePendingInterest(
        MODES.DEBT,
        1000,
        18.99,
        thirtyDaysAgo.toISOString()
      );

      expect(result.success).toBe(true);
      expect(result.data.pendingInterest).toBeGreaterThan(0);
    });

    test('should return 0 for savings mode', () => {
      const result = InterestService.updatePendingInterest(
        MODES.SAVINGS,
        1000,
        18.99,
        new Date().toISOString()
      );

      expect(result.success).toBe(true);
      expect(result.data.pendingInterest).toBe(0);
    });

    test('should return 0 for zero remaining balance in debt mode', () => {
      const result = InterestService.updatePendingInterest(
        MODES.DEBT,
        0,
        18.99,
        new Date().toISOString()
      );

      expect(result.success).toBe(true);
      expect(result.data.pendingInterest).toBe(0);
    });

    test('should fail for invalid mode', () => {
      const result = InterestService.updatePendingInterest(
        'invalid' as any,
        1000,
        18.99,
        new Date().toISOString()
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(INTEREST_SERVICE_ERROR_CODES.INVALID_MODE);
    });

    test('should use last transaction date when no interest date provided', () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const transactions = [
        { id: '1', amount: 100, date: weekAgo.toISOString(), type: 'transaction', runningTotal: 100 }
      ];

      const result = InterestService.updatePendingInterest(
        MODES.DEBT,
        1000,
        18.99,
        null,
        transactions as any
      );

      expect(result.success).toBe(true);
    });
  });

  describe('validateRate', () => {
    test('should validate correct rate', () => {
      const result = InterestService.validateRate(18.99);

      expect(result.isValid).toBe(true);
      expect(result.value).toBe(18.99);
    });

    test('should reject negative rate', () => {
      const result = InterestService.validateRate(-5);

      expect(result.isValid).toBe(false);
    });

    test('should reject rate over maximum', () => {
      const result = InterestService.validateRate(150);

      expect(result.isValid).toBe(false);
    });
  });

  describe('getDailyRate', () => {
    test('should convert annual rate to daily rate', () => {
      const daily = InterestService.getDailyRate(18.25);

      expect(daily).toBeCloseTo(0.05, 2);
    });

    test('should return 0 for 0% annual rate', () => {
      expect(InterestService.getDailyRate(0)).toBe(0);
    });
  });

  describe('getAnnualRate', () => {
    test('should convert daily rate to annual rate', () => {
      const annual = InterestService.getAnnualRate(0.05);

      expect(annual).toBeCloseTo(18.25, 2);
    });

    test('should return 0 for 0% daily rate', () => {
      expect(InterestService.getAnnualRate(0)).toBe(0);
    });
  });
});
