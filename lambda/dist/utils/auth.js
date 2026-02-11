"use strict";
/**
 * Authentication Utilities
 *
 * Extracts user information from JWT claims passed by API Gateway.
 * Story 8.1: User ID Extraction in Lambda
 *
 * @fileoverview JWT claim extraction utilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isResourceOwner = exports.getUserId = exports.extractAuthContext = void 0;
const errors_1 = require("./errors");
/**
 * Extract authentication context from API Gateway event
 *
 * API Gateway HTTP API with JWT authorizer includes claims in the
 * requestContext.authorizer.jwt.claims object.
 *
 * @param event - API Gateway event
 * @returns Authenticated user context
 * @throws AuthenticationError if claims are missing or invalid
 */
const extractAuthContext = (event) => {
    // HTTP API v2 format with JWT authorizer
    // Cast to extended type that includes JWT authorizer structure
    const requestContext = event.requestContext;
    const claims = requestContext?.authorizer?.jwt?.claims;
    if (!claims) {
        console.error('No JWT claims found in request context');
        throw new errors_1.AuthenticationError('Invalid or missing authentication token');
    }
    const userId = claims.sub;
    if (!userId) {
        console.error('No sub claim found in JWT');
        throw new errors_1.AuthenticationError('Invalid authentication token: missing user ID');
    }
    return {
        userId,
        email: claims.email,
        claims,
    };
};
exports.extractAuthContext = extractAuthContext;
/**
 * Extract user ID from event (convenience function)
 *
 * @param event - API Gateway event
 * @returns User ID string
 * @throws AuthenticationError if user ID cannot be extracted
 */
const getUserId = (event) => {
    return (0, exports.extractAuthContext)(event).userId;
};
exports.getUserId = getUserId;
/**
 * Validate that the authenticated user owns a resource
 *
 * @param event - API Gateway event
 * @param resourceUserId - User ID from the resource
 * @returns true if the user owns the resource
 * @throws AuthenticationError if not authenticated
 */
const isResourceOwner = (event, resourceUserId) => {
    const userId = (0, exports.getUserId)(event);
    return userId === resourceUserId;
};
exports.isResourceOwner = isResourceOwner;
//# sourceMappingURL=auth.js.map