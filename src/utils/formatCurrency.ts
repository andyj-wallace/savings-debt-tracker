import { config } from '../config/app.config';
import type { CurrencyOptions } from '../types';

export function formatCurrency(amount: number, options: CurrencyOptions = {}): string {
  const currencyConfig = config.getCurrency();

  const {
    locale = currencyConfig.locale,
    currency = currencyConfig.code,
    minimumFractionDigits = 0,
    maximumFractionDigits = currencyConfig.precision,
    showSymbol = true
  } = options;

  if (!showSymbol) {
    return new Intl.NumberFormat(locale, {
      style: 'decimal',
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(amount);
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(amount);
}

export function formatCurrencyCompact(amount: number): string {
  const currencyConfig = config.getCurrency();

  return new Intl.NumberFormat(currencyConfig.locale, {
    style: 'currency',
    currency: currencyConfig.code,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount);
}

export function formatPercentage(value: number, decimalPlaces: number = 1): string {
  return new Intl.NumberFormat(config.get('currency.locale', 'en-US'), {
    style: 'percent',
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(value / 100);
}