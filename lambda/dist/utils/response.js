"use strict";
/**
 * API Response Utilities
 *
 * Provides consistent response formatting for all Lambda functions.
 *
 * @fileoverview Response builder utilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginated = exports.noContent = exports.created = exports.handleError = exports.error = exports.success = void 0;
const errors_1 = require("./errors");
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
const success = (data, message, statusCode = 200) => {
    const body = {
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
exports.success = success;
/**
 * Build an error API response
 */
const error = (err, correlationId) => {
    const body = {
        success: false,
        error: {
            code: err.code,
            message: err.message,
        },
    };
    // Add validation details if present
    if (err instanceof errors_1.ValidationError && err.details) {
        body.error.details = err.details;
    }
    // Add correlation ID for server errors
    if (err.statusCode >= 500) {
        body.error.correlationId = correlationId || (0, errors_1.generateCorrelationId)();
    }
    return {
        statusCode: err.statusCode,
        headers: corsHeaders,
        body: JSON.stringify(body),
    };
};
exports.error = error;
/**
 * Handle any error and return appropriate API response
 */
const handleError = (err, context) => {
    const appError = (0, errors_1.normalizeError)(err);
    const correlationId = context?.requestId || (0, errors_1.generateCorrelationId)();
    // Log error details
    if (!(0, errors_1.isOperationalError)(err)) {
        console.error('Unhandled error:', {
            correlationId,
            error: err instanceof Error ? err.message : 'Unknown error',
            stack: err instanceof Error ? err.stack : undefined,
        });
    }
    else {
        console.info('Operational error:', {
            code: appError.code,
            message: appError.message,
            statusCode: appError.statusCode,
        });
    }
    return (0, exports.error)(appError, correlationId);
};
exports.handleError = handleError;
/**
 * Build a 201 Created response
 */
const created = (data, message) => {
    return (0, exports.success)(data, message, 201);
};
exports.created = created;
/**
 * Build a 204 No Content response
 */
const noContent = () => {
    return {
        statusCode: 204,
        headers: corsHeaders,
        body: '',
    };
};
exports.noContent = noContent;
/**
 * Build a paginated response
 */
const paginated = (items, lastEvaluatedKey, count) => {
    return (0, exports.success)({
        items,
        count: count ?? items.length,
        nextToken: lastEvaluatedKey
            ? Buffer.from(JSON.stringify(lastEvaluatedKey)).toString('base64')
            : undefined,
    });
};
exports.paginated = paginated;
//# sourceMappingURL=response.js.map