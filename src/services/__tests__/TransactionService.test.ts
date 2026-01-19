/**
 * TransactionService Tests
 *
 * Unit tests for TransactionService business logic methods.
 * Tests transaction creation, addition, deletion, and validation.
 */

import TransactionService from '../TransactionService';
import { MODES } from '../../constants';
import type { Transaction, Mode } from '../../types';

describe('TransactionService', () => {

  describe('createTransaction', () => {
    test('should create a valid savings transaction', () => {
      const result = TransactionService.createTransaction(
        100,
        'Test deposit',
        MODES.SAVINGS as Mode,
        0,
        'transaction'
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(
        expect.objectContaining({
          amount: 100,
          note: 'Test deposit',
          type: 'transaction',
          runningTotal: 100
        })
      );
      expect(result.data?.id).toBeDefined();
      expect(result.data?.date).toBeDefined();
    });

    test('should create a valid debt payment transaction (negative amount)', () => {
      const result = TransactionService.createTransaction(
        100,
        'Payment',
        MODES.DEBT as Mode,
        0,
        'transaction'
      );

      expect(result.success).toBe(true);
      expect(result.data?.amount).toBe(-100); // Should be negative for debt payments
      expect(result.data?.runningTotal).toBe(-100);
    });

    test('should create an interest transaction', () => {
      const result = TransactionService.createTransaction(
        25.50,
        'Interest charge',
        MODES.DEBT as Mode,
        1000,
        'interest',
        30
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(
        expect.objectContaining({
          amount: 25.50,
          note: 'Interest charge',
          type: 'interest',
          days: 30,
          runningTotal: 1025.50
        })
      );
    });

    test('should fail with invalid amount', () => {
      const result = TransactionService.createTransaction(
        -50,
        'Invalid amount',
        MODES.SAVINGS as Mode
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_AMOUNT');
    });

    test('should use default note when empty note provided', () => {
      const savingsResult = TransactionService.createTransaction(
        100,
        '',
        MODES.SAVINGS as Mode
      );

      expect(savingsResult.success).toBe(true);
      expect(savingsResult.data?.note).toBe('Deposit');

      const debtResult = TransactionService.createTransaction(
        100,
        '',
        MODES.DEBT as Mode
      );

      expect(debtResult.success).toBe(true);
      expect(debtResult.data?.note).toBe('Payment');
    });

    test('should fail with invalid mode', () => {
      const result = TransactionService.createTransaction(
        100,
        'Test',
        'invalid_mode' as Mode
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_MODE');
    });
  });

  describe('addTransaction', () => {
    const existingTransactions: Transaction[] = [
      {
        id: '1',
        amount: 500,
        date: '2024-01-01T00:00:00.000Z',
        note: 'Initial deposit',
        type: 'transaction',
        runningTotal: 500
      }
    ];

    test('should add a new savings transaction', () => {
      const result = TransactionService.addTransaction(
        existingTransactions,
        200,
        'Second deposit',
        MODES.SAVINGS as Mode,
        0,
        0,
        500,
        0
      );

      expect(result.success).toBe(true);
      const data = result.data as { transactions: Transaction[]; addedInterest: boolean };
      expect(data.transactions).toHaveLength(2);
      expect(data.addedInterest).toBe(false);
      expect(data.transactions[1]).toEqual(
        expect.objectContaining({
          amount: 200,
          note: 'Second deposit',
          runningTotal: 700
        })
      );
    });

    test('should add interest and payment for debt mode', () => {
      const result = TransactionService.addTransaction(
        existingTransactions,
        100,
        'Payment',
        MODES.DEBT as Mode,
        25,
        30,
        500,
        1000
      );

      expect(result.success).toBe(true);
      const data = result.data as { transactions: Transaction[]; addedInterest: boolean };
      expect(data.transactions).toHaveLength(3);
      expect(data.addedInterest).toBe(true);

      // First should be interest
      expect(data.transactions[1]).toEqual(
        expect.objectContaining({
          amount: 25,
          type: 'interest',
          days: 30
        })
      );

      // Second should be payment
      expect(data.transactions[2]).toEqual(
        expect.objectContaining({
          amount: -100,
          type: 'transaction'
        })
      );
    });
  });

  describe('deleteTransaction', () => {
    const transactions: Transaction[] = [
      { id: '1', amount: 100, runningTotal: 100, date: '2024-01-01', note: 'Test', type: 'transaction' },
      { id: '2', amount: 50, runningTotal: 150, date: '2024-01-02', note: 'Test', type: 'transaction' },
      { id: '3', amount: -25, runningTotal: 125, date: '2024-01-03', note: 'Test', type: 'transaction' }
    ];

    test('should delete transaction and recalculate totals', () => {
      const result = TransactionService.deleteTransaction(transactions, '2');

      expect(result.success).toBe(true);
      expect(result.data?.transactions).toHaveLength(2);
      expect(result.data?.transactions[0].runningTotal).toBe(100);
      expect(result.data?.transactions[1].runningTotal).toBe(75); // Recalculated
    });

    test('should indicate when to reset interest date', () => {
      const singleTransaction: Transaction[] = [
        { id: '1', amount: 100, runningTotal: 100, date: '2024-01-01', note: 'Test', type: 'transaction' }
      ];
      const result = TransactionService.deleteTransaction(singleTransaction, '1');

      expect(result.success).toBe(true);
      expect(result.data?.shouldResetInterestDate).toBe(true);
    });

    test('should fail when transaction not found', () => {
      const result = TransactionService.deleteTransaction(transactions, '999');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('TRANSACTION_NOT_FOUND');
    });
  });

  describe('recalculateRunningTotals', () => {
    test('should recalculate running totals correctly', () => {
      const transactions: Transaction[] = [
        { id: '1', amount: 100, runningTotal: 0, date: '2024-01-01', note: 'Test', type: 'transaction' },
        { id: '2', amount: 50, runningTotal: 0, date: '2024-01-02', note: 'Test', type: 'transaction' },
        { id: '3', amount: -25, runningTotal: 0, date: '2024-01-03', note: 'Test', type: 'transaction' }
      ];

      const result = TransactionService.recalculateRunningTotals(transactions);

      expect(result).toHaveLength(3);
      expect(result[0].runningTotal).toBe(100);
      expect(result[1].runningTotal).toBe(150);
      expect(result[2].runningTotal).toBe(125);
    });
  });

  describe('calculateCurrentTotal', () => {
    test('should calculate total from transactions', () => {
      const transactions: Partial<Transaction>[] = [
        { amount: 100 },
        { amount: 50 },
        { amount: -25 }
      ];

      const result = TransactionService.calculateCurrentTotal(transactions as Transaction[]);
      expect(result).toBe(125);
    });

    test('should return 0 for empty transactions', () => {
      const result = TransactionService.calculateCurrentTotal([]);
      expect(result).toBe(0);
    });
  });

  describe('validateTransactions', () => {
    test('should validate correct transactions array', () => {
      const transactions: Partial<Transaction>[] = [
        { id: '1', amount: 100, date: '2024-01-01' },
        { id: '2', amount: 50, date: '2024-01-02' }
      ];

      const result = TransactionService.validateTransactions(transactions as Transaction[]);
      expect(result.isValid).toBe(true);
    });

    test('should fail validation for non-array', () => {
      const result = TransactionService.validateTransactions('not an array' as any);
      expect(result.isValid).toBe(false);
    });

    test('should fail validation for invalid transaction structure', () => {
      const transactions = [
        { id: '1', amount: 100, date: '2024-01-01' },
        { amount: 50, date: '2024-01-02' } // Missing id
      ] as Partial<Transaction>[];

      const result = TransactionService.validateTransactions(transactions as Transaction[]);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('missing required field: id');
    });
  });
});
