/**
 * Input Validation Utilities
 *
 * Provides validation functions for API request payloads.
 *
 * @fileoverview Request validation utilities
 */

import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { ValidationError } from './errors';
import type { TrackerMode, EntryType } from '../types';

/**
 * Parse and validate JSON body from API Gateway event
 */
export const parseBody = <T = unknown>(event: APIGatewayProxyEventV2): T => {
  if (!event.body) {
    throw new ValidationError('Request body is required');
  }

  try {
    const body = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf-8')
      : event.body;
    return JSON.parse(body) as T;
  } catch {
    throw new ValidationError('Invalid JSON in request body');
  }
};

/**
 * Get path parameter with validation
 */
export const getPathParam = (
  event: APIGatewayProxyEventV2,
  name: string
): string => {
  const value = event.pathParameters?.[name];
  if (!value) {
    throw new ValidationError(`Missing required path parameter: ${name}`);
  }
  return value;
};

/**
 * Get optional query parameter
 */
export const getQueryParam = (
  event: APIGatewayProxyEventV2,
  name: string
): string | undefined => {
  return event.queryStringParameters?.[name];
};

/**
 * Get pagination parameters from query string
 */
export const getPaginationParams = (
  event: APIGatewayProxyEventV2
): { limit: number; nextToken?: Record<string, unknown> } => {
  const limitStr = getQueryParam(event, 'limit');
  const nextTokenStr = getQueryParam(event, 'nextToken');

  let limit = 50; // Default limit
  if (limitStr) {
    const parsed = parseInt(limitStr, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 100) {
      throw new ValidationError('Limit must be between 1 and 100');
    }
    limit = parsed;
  }

  let nextToken: Record<string, unknown> | undefined;
  if (nextTokenStr) {
    try {
      nextToken = JSON.parse(
        Buffer.from(nextTokenStr, 'base64').toString('utf-8')
      ) as Record<string, unknown>;
    } catch {
      throw new ValidationError('Invalid nextToken format');
    }
  }

  return { limit, nextToken };
};

/**
 * Validate tracker mode
 */
export const validateMode = (mode: unknown): TrackerMode => {
  if (mode !== 'savings' && mode !== 'debt') {
    throw new ValidationError('Mode must be "savings" or "debt"');
  }
  return mode;
};

/**
 * Validate entry type
 */
export const validateEntryType = (type: unknown): EntryType => {
  if (type !== 'transaction' && type !== 'interest') {
    throw new ValidationError('Type must be "transaction" or "interest"');
  }
  return type;
};

/**
 * Validate amount (in cents, must be integer)
 */
export const validateAmount = (
  amount: unknown,
  fieldName = 'amount'
): number => {
  if (typeof amount !== 'number' || !Number.isInteger(amount)) {
    throw new ValidationError(`${fieldName} must be an integer (cents)`);
  }
  return amount;
};

/**
 * Validate positive amount
 */
export const validatePositiveAmount = (
  amount: unknown,
  fieldName = 'amount'
): number => {
  const validated = validateAmount(amount, fieldName);
  if (validated <= 0) {
    throw new ValidationError(`${fieldName} must be positive`);
  }
  return validated;
};

/**
 * Validate interest rate (percentage, 0-100)
 */
export const validateInterestRate = (rate: unknown): number => {
  if (typeof rate !== 'number' || rate < 0 || rate > 100) {
    throw new ValidationError('Interest rate must be between 0 and 100');
  }
  return rate;
};

/**
 * Validate required string field
 */
export const validateRequiredString = (
  value: unknown,
  fieldName: string,
  minLength = 1,
  maxLength = 255
): string => {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`);
  }
  const trimmed = value.trim();
  if (trimmed.length < minLength) {
    throw new ValidationError(
      `${fieldName} must be at least ${minLength} character(s)`
    );
  }
  if (trimmed.length > maxLength) {
    throw new ValidationError(
      `${fieldName} must be at most ${maxLength} characters`
    );
  }
  return trimmed;
};

/**
 * Validate optional string field
 */
export const validateOptionalString = (
  value: unknown,
  fieldName: string,
  maxLength = 500
): string | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`);
  }
  if (value.length > maxLength) {
    throw new ValidationError(
      `${fieldName} must be at most ${maxLength} characters`
    );
  }
  return value;
};

/**
 * Create tracker input validation
 */
export interface CreateTrackerBody {
  name: string;
  mode: TrackerMode;
  goalAmount: number;
  currentAmount?: number;
  interestRate?: number;
}

export const validateCreateTrackerInput = (
  body: unknown
): CreateTrackerBody => {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Invalid request body');
  }

  const input = body as Record<string, unknown>;
  const errors: Record<string, string> = {};

  // Validate name
  let name: string;
  try {
    name = validateRequiredString(input.name, 'name');
  } catch (e) {
    errors.name = (e as Error).message;
    name = '';
  }

  // Validate mode
  let mode: TrackerMode;
  try {
    mode = validateMode(input.mode);
  } catch (e) {
    errors.mode = (e as Error).message;
    mode = 'savings';
  }

  // Validate goalAmount
  let goalAmount: number;
  try {
    goalAmount = validatePositiveAmount(input.goalAmount, 'goalAmount');
  } catch (e) {
    errors.goalAmount = (e as Error).message;
    goalAmount = 0;
  }

  // Validate optional currentAmount
  let currentAmount: number | undefined;
  if (input.currentAmount !== undefined) {
    try {
      currentAmount = validateAmount(input.currentAmount, 'currentAmount');
    } catch (e) {
      errors.currentAmount = (e as Error).message;
    }
  }

  // Validate optional interestRate
  let interestRate: number | undefined;
  if (input.interestRate !== undefined) {
    try {
      interestRate = validateInterestRate(input.interestRate);
    } catch (e) {
      errors.interestRate = (e as Error).message;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  return {
    name,
    mode,
    goalAmount,
    currentAmount,
    interestRate,
  };
};

/**
 * Update tracker input validation
 */
export interface UpdateTrackerBody {
  name?: string;
  goalAmount?: number;
  currentAmount?: number;
  interestRate?: number;
}

export const validateUpdateTrackerInput = (
  body: unknown
): UpdateTrackerBody => {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Invalid request body');
  }

  const input = body as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const result: UpdateTrackerBody = {};

  // Validate optional name
  if (input.name !== undefined) {
    try {
      result.name = validateRequiredString(input.name, 'name');
    } catch (e) {
      errors.name = (e as Error).message;
    }
  }

  // Validate optional goalAmount
  if (input.goalAmount !== undefined) {
    try {
      result.goalAmount = validatePositiveAmount(input.goalAmount, 'goalAmount');
    } catch (e) {
      errors.goalAmount = (e as Error).message;
    }
  }

  // Validate optional currentAmount
  if (input.currentAmount !== undefined) {
    try {
      result.currentAmount = validateAmount(input.currentAmount, 'currentAmount');
    } catch (e) {
      errors.currentAmount = (e as Error).message;
    }
  }

  // Validate optional interestRate
  if (input.interestRate !== undefined) {
    try {
      result.interestRate = validateInterestRate(input.interestRate);
    } catch (e) {
      errors.interestRate = (e as Error).message;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  if (Object.keys(result).length === 0) {
    throw new ValidationError('At least one field must be provided for update');
  }

  return result;
};

/**
 * Create entry input validation
 */
export interface CreateEntryBody {
  amount: number;
  type: EntryType;
  note?: string;
  days?: number;
}

export const validateCreateEntryInput = (body: unknown): CreateEntryBody => {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Invalid request body');
  }

  const input = body as Record<string, unknown>;
  const errors: Record<string, string> = {};

  // Validate amount (can be positive or negative)
  let amount: number;
  try {
    amount = validateAmount(input.amount, 'amount');
    if (amount === 0) {
      throw new ValidationError('Amount cannot be zero');
    }
  } catch (e) {
    errors.amount = (e as Error).message;
    amount = 0;
  }

  // Validate type
  let type: EntryType;
  try {
    type = validateEntryType(input.type);
  } catch (e) {
    errors.type = (e as Error).message;
    type = 'transaction';
  }

  // Validate optional note
  let note: string | undefined;
  try {
    note = validateOptionalString(input.note, 'note');
  } catch (e) {
    errors.note = (e as Error).message;
  }

  // Validate optional days (for interest entries)
  let days: number | undefined;
  if (input.days !== undefined) {
    if (typeof input.days !== 'number' || !Number.isInteger(input.days) || input.days < 0) {
      errors.days = 'Days must be a non-negative integer';
    } else {
      days = input.days;
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError('Validation failed', errors);
  }

  return {
    amount,
    type,
    note,
    days,
  };
};
