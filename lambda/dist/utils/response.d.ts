/**
 * API Response Utilities
 *
 * Provides consistent response formatting for all Lambda functions.
 *
 * @fileoverview Response builder utilities
 */
import type { APIGatewayProxyResult } from 'aws-lambda';
import { AppError } from './errors';
/**
 * Success response interface
 */
export interface SuccessResponse<T = unknown> {
    success: true;
    data: T;
    message?: string;
}
/**
 * Build a successful API response
 */
export declare const success: <T>(data: T, message?: string, statusCode?: number) => APIGatewayProxyResult;
/**
 * Build an error API response
 */
export declare const error: (err: AppError, correlationId?: string) => APIGatewayProxyResult;
/**
 * Handle any error and return appropriate API response
 */
export declare const handleError: (err: unknown, context?: {
    requestId?: string;
}) => APIGatewayProxyResult;
/**
 * Build a 201 Created response
 */
export declare const created: <T>(data: T, message?: string) => APIGatewayProxyResult;
/**
 * Build a 204 No Content response
 */
export declare const noContent: () => APIGatewayProxyResult;
/**
 * Build a paginated response
 */
export declare const paginated: <T>(items: T[], lastEvaluatedKey?: Record<string, unknown>, count?: number) => APIGatewayProxyResult;
//# sourceMappingURL=response.d.ts.map