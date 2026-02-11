/**
 * Error Handling Utilities
 *
 * Provides consistent error types and handling across all Lambda functions.
 * Story 5.9: Lambda Error Handling Pattern
 *
 * @fileoverview Error classes and utilities for Lambda functions
 */

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    isOperational = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error - 400 Bad Request
 */
export class ValidationError extends AppError {
  public readonly details?: Record<string, string>;

  constructor(message: string, details?: Record<string, string>) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

/**
 * Authentication error - 401 Unauthorized
 */
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

/**
 * Authorization error - 403 Forbidden
 */
export class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

/**
 * Not found error - 404 Not Found
 * Note: For security, we return 404 instead of 403 when accessing other users' resources
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id
      ? `${resource} not found: ${id}`
      : `${resource} not found`;
    super(message, 404, 'NOT_FOUND');
  }
}

/**
 * Conflict error - 409 Conflict
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * Internal server error - 500 Internal Server Error
 */
export class InternalError extends AppError {
  constructor(message = 'An unexpected error occurred') {
    super(message, 500, 'INTERNAL_ERROR', false);
  }
}

/**
 * Error response interface for API responses
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
    correlationId?: string;
  };
}

/**
 * Generate a correlation ID for error tracking
 */
export const generateCorrelationId = (): string => {
  return `err-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Check if an error is an operational (expected) error
 */
export const isOperationalError = (error: unknown): error is AppError => {
  return error instanceof AppError && error.isOperational;
};

/**
 * Convert any error to an AppError for consistent handling
 */
export const normalizeError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    // Check for DynamoDB-specific errors
    if (error.name === 'ConditionalCheckFailedException') {
      return new ConflictError('Item already exists or update condition failed');
    }
    if (error.name === 'ResourceNotFoundException') {
      return new NotFoundError('Resource');
    }
    if (error.name === 'ValidationException') {
      return new ValidationError(error.message);
    }

    return new InternalError(error.message);
  }

  return new InternalError('An unknown error occurred');
};
