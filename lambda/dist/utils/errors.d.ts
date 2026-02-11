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
export declare class AppError extends Error {
    readonly statusCode: number;
    readonly code: string;
    readonly isOperational: boolean;
    constructor(message: string, statusCode: number, code: string, isOperational?: boolean);
}
/**
 * Validation error - 400 Bad Request
 */
export declare class ValidationError extends AppError {
    readonly details?: Record<string, string>;
    constructor(message: string, details?: Record<string, string>);
}
/**
 * Authentication error - 401 Unauthorized
 */
export declare class AuthenticationError extends AppError {
    constructor(message?: string);
}
/**
 * Authorization error - 403 Forbidden
 */
export declare class AuthorizationError extends AppError {
    constructor(message?: string);
}
/**
 * Not found error - 404 Not Found
 * Note: For security, we return 404 instead of 403 when accessing other users' resources
 */
export declare class NotFoundError extends AppError {
    constructor(resource: string, id?: string);
}
/**
 * Conflict error - 409 Conflict
 */
export declare class ConflictError extends AppError {
    constructor(message: string);
}
/**
 * Internal server error - 500 Internal Server Error
 */
export declare class InternalError extends AppError {
    constructor(message?: string);
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
export declare const generateCorrelationId: () => string;
/**
 * Check if an error is an operational (expected) error
 */
export declare const isOperationalError: (error: unknown) => error is AppError;
/**
 * Convert any error to an AppError for consistent handling
 */
export declare const normalizeError: (error: unknown) => AppError;
//# sourceMappingURL=errors.d.ts.map