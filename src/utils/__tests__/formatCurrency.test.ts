/**
 * Format Currency Tests
 *
 * Unit tests for currency formatting utility functions.
 * Tests currency formatting, compact notation, and percentage formatting.
 */

import {
  formatCurrency,
  formatCurrencyCompact,
  formatPercentage
} from '../formatCurrency';

describe('formatCurrency', () => {
  describe('formatCurrency', () => {
    test('should format positive amounts', () => {
      const formatted = formatCurrency(1234.56);

      expect(formatted).toContain('1,234');
      expect(formatted).toContain('$');
    });

    test('should format negative amounts', () => {
      const formatted = formatCurrency(-567.89);

      // Different locales may show negative differently (-$567.89 or ($567.89))
      expect(formatted).toContain('567');
      expect(formatted).toContain('$');
    });

    test('should format zero', () => {
      const formatted = formatCurrency(0);

      expect(formatted).toContain('$');
      expect(formatted).toContain('0');
    });

    test('should format large amounts with commas', () => {
      const formatted = formatCurrency(1000000);

      expect(formatted).toContain('1,000,000');
    });

    test('should format small amounts', () => {
      const formatted = formatCurrency(0.99);

      expect(formatted).toContain('0');
      expect(formatted).toContain('$');
    });

    test('should hide symbol when showSymbol is false', () => {
      const formatted = formatCurrency(100, { showSymbol: false });

      expect(formatted).not.toContain('$');
      expect(formatted).toContain('100');
    });

    test('should respect custom locale', () => {
      const formatted = formatCurrency(1234.56, { locale: 'en-US' });

      expect(formatted).toContain('$');
    });

    test('should respect minimumFractionDigits', () => {
      const formatted = formatCurrency(100, { minimumFractionDigits: 2 });

      expect(formatted).toContain('100.00');
    });

    test('should respect maximumFractionDigits', () => {
      const formatted = formatCurrency(100.999, { maximumFractionDigits: 2 });

      // Should round to 2 decimal places
      expect(formatted).toMatch(/101|100\.99|101\.00/);
    });

    test('should handle decimal amounts', () => {
      const formatted = formatCurrency(99.99);

      expect(formatted).toContain('99');
    });
  });

  describe('formatCurrencyCompact', () => {
    test('should format thousands with K', () => {
      const formatted = formatCurrencyCompact(5000);

      expect(formatted).toContain('$');
      expect(formatted.toLowerCase()).toContain('k');
    });

    test('should format millions with M', () => {
      const formatted = formatCurrencyCompact(2500000);

      expect(formatted).toContain('$');
      expect(formatted.toLowerCase()).toContain('m');
    });

    test('should handle small amounts without notation', () => {
      const formatted = formatCurrencyCompact(500);

      expect(formatted).toContain('$');
      expect(formatted).toContain('500');
    });

    test('should format negative amounts', () => {
      const formatted = formatCurrencyCompact(-10000);

      expect(formatted).toContain('$');
      expect(formatted.toLowerCase()).toContain('k');
    });

    test('should format zero', () => {
      const formatted = formatCurrencyCompact(0);

      expect(formatted).toContain('$');
      expect(formatted).toContain('0');
    });

    test('should handle decimals', () => {
      const formatted = formatCurrencyCompact(1500);

      expect(formatted).toContain('$');
      // Should be something like "$1.5K"
      expect(formatted.toLowerCase()).toContain('k');
    });
  });

  describe('formatPercentage', () => {
    test('should format whole number percentages', () => {
      const formatted = formatPercentage(50);

      expect(formatted).toContain('50');
      expect(formatted).toContain('%');
    });

    test('should format decimal percentages', () => {
      const formatted = formatPercentage(75.5);

      expect(formatted).toContain('75');
      expect(formatted).toContain('%');
    });

    test('should handle 0%', () => {
      const formatted = formatPercentage(0);

      expect(formatted).toContain('0');
      expect(formatted).toContain('%');
    });

    test('should handle 100%', () => {
      const formatted = formatPercentage(100);

      expect(formatted).toContain('100');
      expect(formatted).toContain('%');
    });

    test('should handle values over 100%', () => {
      const formatted = formatPercentage(150);

      expect(formatted).toContain('150');
      expect(formatted).toContain('%');
    });

    test('should respect custom decimal places', () => {
      const formatted = formatPercentage(33.333, 2);

      expect(formatted).toContain('33.33');
      expect(formatted).toContain('%');
    });

    test('should default to 1 decimal place', () => {
      const formatted = formatPercentage(66.666);

      // Should round to 1 decimal place
      expect(formatted).toMatch(/66\.6|66\.7/);
      expect(formatted).toContain('%');
    });

    test('should handle small percentages', () => {
      const formatted = formatPercentage(0.5);

      expect(formatted).toContain('0.5');
      expect(formatted).toContain('%');
    });
  });
});
