/**
 * Calculate credit card interest using daily periodic rate
 * @param {number} balance - Current balance
 * @param {number} annualRate - Annual interest rate (e.g., 18.99 for 18.99%)
 * @param {number} days - Number of days since last transaction
 * @returns {number} Interest charged
 */
export function calculateInterest(balance, annualRate, days = 30) {
  if (balance <= 0 || annualRate <= 0) return 0;
  
  const dailyRate = annualRate / 100 / 365;
  const interest = balance * dailyRate * days;
  
  return Math.round(interest * 100) / 100; // Round to 2 decimals
}

/**
 * Calculate days between two dates
 * @param {string|Date} date1 - Earlier date
 * @param {string|Date} date2 - Later date
 * @returns {number} Number of days
 */
export function daysBetween(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Get days since last transaction or default to 30 days
 * @param {Array} transactions - Array of transactions
 * @returns {number} Days since last transaction
 */
export function getDaysSinceLastTransaction(transactions) {
  if (transactions.length === 0) return 30;
  
  const lastTransaction = transactions[transactions.length - 1];
  return daysBetween(lastTransaction.date, new Date());
}

/**
 * Calculate pending interest that hasn't been charged yet
 * @param {number} balance - Current balance
 * @param {number} annualRate - Annual interest rate
 * @param {string|Date} lastChargeDate - Date of last interest charge
 * @returns {object} Object with pendingInterest and daysPending
 */
export function calculatePendingInterest(balance, annualRate, lastChargeDate) {
  if (balance <= 0 || !lastChargeDate) {
    return { pendingInterest: 0, daysPending: 0 };
  }
  
  const daysPending = daysBetween(lastChargeDate, new Date());
  const pendingInterest = calculateInterest(balance, annualRate, daysPending);
  
  return { pendingInterest, daysPending };
}

/**
 * Check if it's time to apply monthly interest (30+ days since last charge)
 * @param {string|Date} lastChargeDate - Date of last interest charge
 * @param {number} billingCycleDays - Days in billing cycle (default 30)
 * @returns {boolean} True if interest should be applied
 */
export function shouldApplyInterest(lastChargeDate, billingCycleDays = 30) {
  if (!lastChargeDate) return true; // First time
  
  const daysSince = daysBetween(lastChargeDate, new Date());
  return daysSince >= billingCycleDays;
}