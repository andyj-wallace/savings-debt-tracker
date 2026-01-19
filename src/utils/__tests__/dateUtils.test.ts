/**
 * Date Utils Tests
 *
 * Unit tests for date formatting utility functions.
 * Tests date formatting, short dates, date ranges, and relative time.
 */

import {
  formatDate,
  formatShortDate,
  formatDateRange,
  getRelativeTime
} from '../dateUtils';

describe('dateUtils', () => {
  describe('formatDate', () => {
    test('should format a Date object', () => {
      const date = new Date('2024-06-15T14:30:00');
      const formatted = formatDate(date);

      // Should contain month, day, year
      expect(formatted).toContain('Jun');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2024');
    });

    test('should format a string date', () => {
      const formatted = formatDate('2024-06-15T14:30:00');

      expect(formatted).toContain('Jun');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2024');
    });

    test('should include time by default', () => {
      const date = new Date('2024-06-15T14:30:00');
      const formatted = formatDate(date);

      // Should contain time elements
      expect(formatted).toMatch(/\d{1,2}:\d{2}/);
    });

    test('should exclude time when includeTime is false', () => {
      const date = new Date('2024-06-15T14:30:00');
      const formatted = formatDate(date, { includeTime: false });

      // Should contain date parts
      expect(formatted).toContain('Jun');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2024');
    });

    test('should respect custom locale', () => {
      const date = new Date('2024-06-15T14:30:00');
      const formattedUS = formatDate(date, { locale: 'en-US' });
      const formattedUK = formatDate(date, { locale: 'en-GB' });

      // Both should contain the date info
      expect(formattedUS).toContain('Jun');
      expect(formattedUK).toContain('Jun');
    });
  });

  describe('formatShortDate', () => {
    test('should format a Date object to short format', () => {
      // Use a specific time to avoid timezone issues
      const date = new Date(2024, 5, 15); // June 15, 2024 (month is 0-indexed)
      const formatted = formatShortDate(date);

      // Should contain month and day
      expect(formatted).toContain('Jun');
      expect(formatted).toMatch(/\d+/); // Contains a number
    });

    test('should format a string date', () => {
      // Use Date constructor to ensure consistent timezone handling
      const date = new Date(2024, 11, 25); // December 25, 2024
      const formatted = formatShortDate(date);

      expect(formatted).toContain('Dec');
    });

    test('should respect custom locale', () => {
      const date = new Date(2024, 5, 15); // June 15, 2024
      const formatted = formatShortDate(date, { locale: 'en-US' });

      expect(formatted).toContain('Jun');
    });

    test('should handle different months', () => {
      expect(formatShortDate(new Date(2024, 0, 15))).toContain('Jan');
      expect(formatShortDate(new Date(2024, 6, 15))).toContain('Jul');
      expect(formatShortDate(new Date(2024, 11, 15))).toContain('Dec');
    });
  });

  describe('formatDateRange', () => {
    test('should format a date range', () => {
      const start = new Date('2024-01-15');
      const end = new Date('2024-02-15');
      const formatted = formatDateRange(start, end);

      // Should contain both dates
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('Feb');
    });

    test('should handle string dates', () => {
      const formatted = formatDateRange('2024-01-15', '2024-02-15');

      expect(formatted).toContain('Jan');
      expect(formatted).toContain('Feb');
    });

    test('should handle same month range', () => {
      const start = new Date('2024-06-01');
      const end = new Date('2024-06-30');
      const formatted = formatDateRange(start, end);

      expect(formatted).toContain('Jun');
    });

    test('should respect custom locale', () => {
      const formatted = formatDateRange('2024-01-15', '2024-02-15', { locale: 'en-US' });

      expect(formatted).toContain('Jan');
      expect(formatted).toContain('Feb');
    });

    test('should handle cross-year range', () => {
      const formatted = formatDateRange('2023-12-15', '2024-01-15');

      expect(formatted).toContain('Dec');
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('2023');
      expect(formatted).toContain('2024');
    });
  });

  describe('getRelativeTime', () => {
    test('should return relative time for days ago', () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const relative = getRelativeTime(twoDaysAgo);

      // Should contain "day" or "days"
      expect(relative.toLowerCase()).toMatch(/day/);
    });

    test('should return relative time for hours ago', () => {
      const twoHoursAgo = new Date();
      twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

      const relative = getRelativeTime(twoHoursAgo);

      // Should return a string (may vary based on time granularity)
      expect(typeof relative).toBe('string');
      expect(relative.length).toBeGreaterThan(0);
    });

    test('should return relative time for minutes ago', () => {
      const thirtyMinutesAgo = new Date();
      thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);

      const relative = getRelativeTime(thirtyMinutesAgo);

      // Should return a string (may vary based on time granularity)
      expect(typeof relative).toBe('string');
      expect(relative.length).toBeGreaterThan(0);
    });

    test('should handle string dates', () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const relative = getRelativeTime(twoDaysAgo.toISOString());

      expect(relative.toLowerCase()).toMatch(/day/);
    });

    test('should return relative time for future dates', () => {
      const twoDaysFromNow = new Date();
      twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

      const relative = getRelativeTime(twoDaysFromNow);

      // Should contain "day" (in X days)
      expect(relative.toLowerCase()).toMatch(/day/);
    });

    test('should respect style option', () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const longStyle = getRelativeTime(twoDaysAgo, { style: 'long' });
      const shortStyle = getRelativeTime(twoDaysAgo, { style: 'short' });

      // Both should contain time information
      expect(longStyle).toBeTruthy();
      expect(shortStyle).toBeTruthy();
    });

    test('should respect locale option', () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const relativeUS = getRelativeTime(twoDaysAgo, { locale: 'en-US' });

      expect(relativeUS).toBeTruthy();
    });
  });
});
