/**
 * CalculationService Tests
 *
 * Unit tests for CalculationService financial calculation methods.
 * Tests progress calculations, percentage calculations, and goal tracking.
 */

import CalculationService from '../CalculationService';
import { MODES } from '../../constants';

describe('CalculationService', () => {

  describe('calculateProgress', () => {
    test('should calculate savings progress correctly', () => {
      const result = CalculationService.calculateProgress(MODES.SAVINGS, 750, 1000);

      expect(result.success).toBe(true);
      expect(result.data.percentage).toBe(75);
      expect(result.data.remaining).toBe(250);
    });

    test('should cap savings progress at 100%', () => {
      const result = CalculationService.calculateProgress(MODES.SAVINGS, 1200, 1000);

      expect(result.success).toBe(true);
      expect(result.data.percentage).toBe(100);
      expect(result.data.remaining).toBe(0);
    });

    test('should calculate debt progress correctly', () => {
      // $5000 debt, paid $2000 (current = -2000), remaining debt = $3000
      const result = CalculationService.calculateProgress(MODES.DEBT, -2000, 5000);

      expect(result.success).toBe(true);
      expect(result.data.percentage).toBe(40); // 40% paid off
      expect(result.data.remaining).toBe(3000); // $3000 remaining
    });

    test('should handle debt fully paid off', () => {
      // $5000 debt, paid $5000 (current = -5000), debt fully paid
      const result = CalculationService.calculateProgress(MODES.DEBT, -5000, 5000);

      expect(result.success).toBe(true);
      expect(result.data.percentage).toBe(100);
      expect(result.data.remaining).toBe(0);
    });

    test('should fail with invalid mode', () => {
      const result = CalculationService.calculateProgress('invalid', 500, 1000);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_MODE');
    });

    test('should fail with zero goal', () => {
      const result = CalculationService.calculateProgress(MODES.SAVINGS, 500, 0);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_GOAL');
    });

    test('should fail with invalid goal', () => {
      const result = CalculationService.calculateProgress(MODES.SAVINGS, 500, -1000);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_GOAL');
    });
  });

  describe('calculateSavingsProgress', () => {
    test('should be a convenience method for savings mode', () => {
      const result = CalculationService.calculateSavingsProgress(300, 1000);

      expect(result.success).toBe(true);
      expect(result.data.percentage).toBe(30);
      expect(result.data.remaining).toBe(700);
    });
  });

  describe('calculateDebtProgress', () => {
    test('should be a convenience method for debt mode', () => {
      const result = CalculationService.calculateDebtProgress(-1500, 3000);

      expect(result.success).toBe(true);
      expect(result.data.percentage).toBe(50);
      expect(result.data.remaining).toBe(1500);
    });
  });

  describe('isGoalReached', () => {
    test('should return true when savings goal is reached', () => {
      const result = CalculationService.isGoalReached(MODES.SAVINGS, 1000, 1000);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    test('should return true when debt is fully paid', () => {
      const result = CalculationService.isGoalReached(MODES.DEBT, -5000, 5000);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    test('should return false when goal not reached', () => {
      const result = CalculationService.isGoalReached(MODES.SAVINGS, 500, 1000);

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });
  });

  describe('calculateTotalFromTransactions', () => {
    test('should calculate total from valid transactions', () => {
      const transactions = [
        { amount: 100 },
        { amount: 50 },
        { amount: -25 },
        { amount: 75 }
      ];

      const result = CalculationService.calculateTotalFromTransactions(transactions);

      expect(result.success).toBe(true);
      expect(result.data).toBe(200);
    });

    test('should handle empty transactions array', () => {
      const result = CalculationService.calculateTotalFromTransactions([]);

      expect(result.success).toBe(true);
      expect(result.data).toBe(0);
    });

    test('should ignore invalid transactions', () => {
      const transactions = [
        { amount: 100 },
        { amount: 'invalid' },
        { amount: 50 },
        null,
        { amount: 25 }
      ];

      const result = CalculationService.calculateTotalFromTransactions(transactions);

      expect(result.success).toBe(true);
      expect(result.data).toBe(175); // Only valid amounts
    });

    test('should fail with non-array input', () => {
      const result = CalculationService.calculateTotalFromTransactions('not an array');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('CALCULATION_ERROR');
    });
  });

  describe('calculateMonthlyPayment', () => {
    test('should calculate monthly payment for savings', () => {
      const result = CalculationService.calculateMonthlyPayment(
        MODES.SAVINGS,
        200, // current
        1000, // goal
        8 // months
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe(100); // $800 remaining / 8 months = $100/month
    });

    test('should calculate monthly payment for debt without interest', () => {
      const result = CalculationService.calculateMonthlyPayment(
        MODES.DEBT,
        -1000, // paid $1000
        5000, // original debt
        12, // months
        0 // no interest
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeCloseTo(333.33, 2); // $4000 remaining / 12 months
    });

    test('should return 0 when goal already reached', () => {
      const result = CalculationService.calculateMonthlyPayment(
        MODES.SAVINGS,
        1000,
        1000,
        12
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe(0);
    });

    test('should fail with invalid months', () => {
      const result = CalculationService.calculateMonthlyPayment(
        MODES.SAVINGS,
        500,
        1000,
        0
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('CALCULATION_ERROR');
    });
  });

  describe('formatCurrency', () => {
    test('should format positive amounts', () => {
      const result = CalculationService.formatCurrency(1234.56);
      expect(result).toBe('$1,234.56');
    });

    test('should format negative amounts', () => {
      const result = CalculationService.formatCurrency(-567.89);
      expect(result).toBe('-$567.89');
    });

    test('should handle zero', () => {
      const result = CalculationService.formatCurrency(0);
      expect(result).toBe('$0.00');
    });

    test('should handle non-numeric input', () => {
      const result = CalculationService.formatCurrency('invalid');
      expect(result).toBe('$0.00');
    });
  });
});