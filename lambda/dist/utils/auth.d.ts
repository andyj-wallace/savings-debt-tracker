/**
 * Authentication Utilities
 *
 * Extracts user information from JWT claims passed by API Gateway.
 * Story 8.1: User ID Extraction in Lambda
 *
 * @fileoverview JWT claim extraction utilities
 */
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
/**
 * JWT claims from Cognito
 */
export interface JWTClaims {
    /** User's unique identifier (sub) */
    sub: string;
    /** User's email */
    email?: string;
    /** Email verification status */
    email_verified?: string;
    /** Token issuer */
    iss?: string;
    /** Client ID */
    client_id?: string;
    /** Token type */
    token_use?: string;
    /** Token expiration timestamp */
    exp?: number;
    /** Token issued at timestamp */
    iat?: number;
}
/**
 * Authenticated user context
 */
export interface AuthContext {
    /** User's unique identifier (Cognito sub) */
    userId: string;
    /** User's email if available */
    email?: string;
    /** Raw JWT claims */
    claims: JWTClaims;
}
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
export declare const extractAuthContext: (event: APIGatewayProxyEventV2) => AuthContext;
/**
 * Extract user ID from event (convenience function)
 *
 * @param event - API Gateway event
 * @returns User ID string
 * @throws AuthenticationError if user ID cannot be extracted
 */
export declare const getUserId: (event: APIGatewayProxyEventV2) => string;
/**
 * Validate that the authenticated user owns a resource
 *
 * @param event - API Gateway event
 * @param resourceUserId - User ID from the resource
 * @returns true if the user owns the resource
 * @throws AuthenticationError if not authenticated
 */
export declare const isResourceOwner: (event: APIGatewayProxyEventV2, resourceUserId: string) => boolean;
//# sourceMappingURL=auth.d.ts.map