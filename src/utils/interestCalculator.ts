import { config } from '../config/app.config';
import type { InterestCalculation, Transaction, CompoundingFrequency, RoundingMode } from '../types';

/**
 * Calculate credit card interest using configurable compounding
 * @param balance - Current balance
 * @param annualRate - Annual interest rate (e.g., 18.99 for 18.99%)
 * @param days - Number of days since last transaction
 * @returns Interest charged
 */
export function calculateInterest(balance: number, annualRate: number, days: number = 30): number {
  if (balance <= 0 || annualRate <= 0) return 0;

  const financeConfig = config.getFinance();
  const { compoundingFrequency, roundingMode, precision } = financeConfig.interest;

  let periodsPerYear;
  switch (compoundingFrequency) {
    case 'daily':
      periodsPerYear = 365;
      break;
    case 'monthly':
      periodsPerYear = 12;
      days = Math.ceil(days / 30); // Convert to months
      break;
    case 'yearly':
      periodsPerYear = 1;
      days = Math.ceil(days / 365); // Convert to years
      break;
    default:
      periodsPerYear = 365; // Default to daily
  }

  const periodicRate = annualRate / 100 / periodsPerYear;
  const interest = balance * periodicRate * days;

  // Apply rounding mode from configuration
  let roundedInterest;
  switch (roundingMode) {
    case 'floor':
      roundedInterest = Math.floor(interest * Math.pow(10, precision)) / Math.pow(10, precision);
      break;
    case 'ceil':
      roundedInterest = Math.ceil(interest * Math.pow(10, precision)) / Math.pow(10, precision);
      break;
    default:
      roundedInterest = Math.round(interest * Math.pow(10, precision)) / Math.pow(10, precision);
  }

  return roundedInterest;
}

/**
 * Calculate days between two dates
 * @param date1 - Earlier date
 * @param date2 - Later date
 * @returns Number of days
 */
export function daysBetween(date1: string | Date, date2: string | Date): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Get days since last transaction or default to 30 days
 * @param transactions - Array of transactions
 * @returns Days since last transaction
 */
export function getDaysSinceLastTransaction(transactions: Transaction[]): number {
  if (transactions.length === 0) return 30;

  const lastTransaction = transactions[transactions.length - 1];
  return daysBetween(lastTransaction.date, new Date());
}

/**
 * Calculate pending interest that hasn't been charged yet
 * @param balance - Current balance
 * @param annualRate - Annual interest rate
 * @param lastChargeDate - Date of last interest charge
 * @returns Object with pendingInterest and daysPending
 */
export function calculatePendingInterest(
  balance: number,
  annualRate: number,
  lastChargeDate: string | Date | null
): { pendingInterest: number; daysPending: number } {
  if (balance <= 0 || !lastChargeDate) {
    return { pendingInterest: 0, daysPending: 0 };
  }

  const daysPending = daysBetween(lastChargeDate, new Date());
  const pendingInterest = calculateInterest(balance, annualRate, daysPending);

  return { pendingInterest, daysPending };
}

/**
 * Check if it's time to apply interest based on configuration
 * @param lastChargeDate - Date of last interest charge
 * @param customThreshold - Custom threshold override
 * @returns True if interest should be applied
 */
export function shouldApplyInterest(
  lastChargeDate: string | Date | null,
  customThreshold: number | null = null
): boolean {
  if (!lastChargeDate) return true; // First time

  const financeConfig = config.getFinance();
  const thresholdDays = customThreshold ?? financeConfig.interest.autoApplyThresholdDays;

  const daysSince = daysBetween(lastChargeDate, new Date());
  return daysSince >= thresholdDays;
}

/**
 * Create a detailed interest calculation object
 * @param balance - Current balance
 * @param annualRate - Annual interest rate
 * @param days - Number of days
 * @returns Detailed interest calculation
 */
export function createInterestCalculation(
  balance: number,
  annualRate: number,
  days: number = 30
): InterestCalculation {
  const financeConfig = config.getFinance();
  const interest = calculateInterest(balance, annualRate, days);

  return {
    principal: balance,
    rate: annualRate,
    days,
    interest,
    compoundingFrequency: financeConfig.interest.compoundingFrequency
  };
}