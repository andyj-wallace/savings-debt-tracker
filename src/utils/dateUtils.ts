import { config } from '../config/app.config';
import type { DateOptions } from '../types';

export function formatDate(date: Date | string, options: DateOptions = {}): string {
  const dateTimeConfig = config.getDateTime();

  const {
    locale = dateTimeConfig.locale,
    includeTime = true,
    dateStyle = 'medium'
  } = options;

  const formatOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };

  if (includeTime) {
    formatOptions.hour = 'numeric';
    formatOptions.minute = '2-digit';
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, formatOptions).format(dateObj);
}

export function formatShortDate(date: Date | string, options: Pick<DateOptions, 'locale'> = {}): string {
  const dateTimeConfig = config.getDateTime();

  const {
    locale = dateTimeConfig.locale
  } = options;

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
  }).format(dateObj);
}

export function formatDateRange(
  startDate: Date | string,
  endDate: Date | string,
  options: Pick<DateOptions, 'locale'> = {}
): string {
  const dateTimeConfig = config.getDateTime();

  const {
    locale = dateTimeConfig.locale
  } = options;

  const startDateObj = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const endDateObj = typeof endDate === 'string' ? new Date(endDate) : endDate;

  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).formatRange(startDateObj, endDateObj);
}

export function getRelativeTime(
  date: Date | string,
  options: { locale?: string; style?: 'long' | 'short' | 'narrow' } = {}
): string {
  const dateTimeConfig = config.getDateTime();

  const {
    locale = dateTimeConfig.locale,
    style = 'long'
  } = options;

  if (!dateTimeConfig.relativeTime) {
    return formatDate(date, { includeTime: false });
  }

  const rtf = new Intl.RelativeTimeFormat(locale, { style });
  const now = new Date();
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const diffInSeconds = Math.floor((dateObj.getTime() - now.getTime()) / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (Math.abs(diffInDays) >= 1) {
    return rtf.format(diffInDays, 'day');
  } else if (Math.abs(diffInHours) >= 1) {
    return rtf.format(diffInHours, 'hour');
  } else if (Math.abs(diffInMinutes) >= 1) {
    return rtf.format(diffInMinutes, 'minute');
  } else {
    return rtf.format(diffInSeconds, 'second');
  }
}