/**
 * API Response Utilities
 *
 * Provides consistent response formatting for all Lambda functions.
 *
 * @fileoverview Response builder utilities
 */

import type { APIGatewayProxyResult } from 'aws-lambda';
import {
  AppError,
  ErrorResponse,
  generateCorrelationId,
  isOperationalError,
  normalizeError,
  ValidationError,
} from './errors';

/**
 * Success response interface
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

/**
 * CORS headers for API Gateway responses
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Content-Type': 'application/json',
};

/**
 * Build a successful API response
 */
export const success = <T>(
  data: T,
  message?: string,
  statusCode = 200
): APIGatewayProxyResult => {
  const body: SuccessResponse<T> = {
    success: true,
    data,
  };

  if (message) {
    body.message = message;
  }

  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(body),
  };
};

/**
 * Build an error API response
 */
export const error = (
  err: AppError,
  correlationId?: string
): APIGatewayProxyResult => {
  const body: ErrorResponse = {
    success: false,
    error: {
      code: err.code,
      message: err.message,
    },
  };

  // Add validation details if present
  if (err instanceof ValidationError && err.details) {
    body.error.details = err.details;
  }

  // Add correlation ID for server errors
  if (err.statusCode >= 500) {
    body.error.correlationId = correlationId || generateCorrelationId();
  }

  return {
    statusCode: err.statusCode,
    headers: corsHeaders,
    body: JSON.stringify(body),
  };
};

/**
 * Handle any error and return appropriate API response
 */
export const handleError = (
  err: unknown,
  context?: { requestId?: string }
): APIGatewayProxyResult => {
  const appError = normalizeError(err);
  const correlationId = context?.requestId || generateCorrelationId();

  // Log error details
  if (!isOperationalError(err)) {
    console.error('Unhandled error:', {
      correlationId,
      error: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : undefined,
    });
  } else {
    console.info('Operational error:', {
      code: appError.code,
      message: appError.message,
      statusCode: appError.statusCode,
    });
  }

  return error(appError, correlationId);
};

/**
 * Build a 201 Created response
 */
export const created = <T>(data: T, message?: string): APIGatewayProxyResult => {
  return success(data, message, 201);
};

/**
 * Build a 204 No Content response
 */
export const noContent = (): APIGatewayProxyResult => {
  return {
    statusCode: 204,
    headers: corsHeaders,
    body: '',
  };
};

/**
 * Build a paginated response
 */
export const paginated = <T>(
  items: T[],
  lastEvaluatedKey?: Record<string, unknown>,
  count?: number
): APIGatewayProxyResult => {
  return success({
    items,
    count: count ?? items.length,
    nextToken: lastEvaluatedKey
      ? Buffer.from(JSON.stringify(lastEvaluatedKey)).toString('base64')
      : undefined,
  });
};
