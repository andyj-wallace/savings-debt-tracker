"use strict";
/**
 * Error Handling Utilities
 *
 * Provides consistent error types and handling across all Lambda functions.
 * Story 5.9: Lambda Error Handling Pattern
 *
 * @fileoverview Error classes and utilities for Lambda functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeError = exports.isOperationalError = exports.generateCorrelationId = exports.InternalError = exports.ConflictError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = exports.AppError = void 0;
/**
 * Base application error class
 */
class AppError extends Error {
    statusCode;
    code;
    isOperational;
    constructor(message, statusCode, code, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = isOperational;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
/**
 * Validation error - 400 Bad Request
 */
class ValidationError extends AppError {
    details;
    constructor(message, details) {
        super(message, 400, 'VALIDATION_ERROR');
        this.details = details;
    }
}
exports.ValidationError = ValidationError;
/**
 * Authentication error - 401 Unauthorized
 */
class AuthenticationError extends AppError {
    constructor(message = 'Authentication required') {
        super(message, 401, 'AUTHENTICATION_ERROR');
    }
}
exports.AuthenticationError = AuthenticationError;
/**
 * Authorization error - 403 Forbidden
 */
class AuthorizationError extends AppError {
    constructor(message = 'Access denied') {
        super(message, 403, 'AUTHORIZATION_ERROR');
    }
}
exports.AuthorizationError = AuthorizationError;
/**
 * Not found error - 404 Not Found
 * Note: For security, we return 404 instead of 403 when accessing other users' resources
 */
class NotFoundError extends AppError {
    constructor(resource, id) {
        const message = id
            ? `${resource} not found: ${id}`
            : `${resource} not found`;
        super(message, 404, 'NOT_FOUND');
    }
}
exports.NotFoundError = NotFoundError;
/**
 * Conflict error - 409 Conflict
 */
class ConflictError extends AppError {
    constructor(message) {
        super(message, 409, 'CONFLICT');
    }
}
exports.ConflictError = ConflictError;
/**
 * Internal server error - 500 Internal Server Error
 */
class InternalError extends AppError {
    constructor(message = 'An unexpected error occurred') {
        super(message, 500, 'INTERNAL_ERROR', false);
    }
}
exports.InternalError = InternalError;
/**
 * Generate a correlation ID for error tracking
 */
const generateCorrelationId = () => {
    return `err-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};
exports.generateCorrelationId = generateCorrelationId;
/**
 * Check if an error is an operational (expected) error
 */
const isOperationalError = (error) => {
    return error instanceof AppError && error.isOperational;
};
exports.isOperationalError = isOperationalError;
/**
 * Convert any error to an AppError for consistent handling
 */
const normalizeError = (error) => {
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
exports.normalizeError = normalizeError;
//# sourceMappingURL=errors.js.map