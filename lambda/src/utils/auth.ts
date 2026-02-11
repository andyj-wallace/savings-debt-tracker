/**
 * Authentication Utilities
 *
 * Extracts user information from JWT claims passed by API Gateway.
 * Story 8.1: User ID Extraction in Lambda
 *
 * @fileoverview JWT claim extraction utilities
 */

import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { AuthenticationError } from './errors';

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
 * Extended request context with JWT authorizer
 * The AWS types don't fully include the JWT authorizer structure
 */
interface RequestContextWithJWT {
  authorizer?: {
    jwt?: {
      claims?: Record<string, unknown>;
    };
  };
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
export const extractAuthContext = (
  event: APIGatewayProxyEventV2
): AuthContext => {
  // HTTP API v2 format with JWT authorizer
  // Cast to extended type that includes JWT authorizer structure
  const requestContext = event.requestContext as unknown as RequestContextWithJWT;
  const claims = requestContext?.authorizer?.jwt?.claims as unknown as JWTClaims;

  if (!claims) {
    console.error('No JWT claims found in request context');
    throw new AuthenticationError('Invalid or missing authentication token');
  }

  const userId = claims.sub;

  if (!userId) {
    console.error('No sub claim found in JWT');
    throw new AuthenticationError('Invalid authentication token: missing user ID');
  }

  return {
    userId,
    email: claims.email,
    claims,
  };
};

/**
 * Extract user ID from event (convenience function)
 *
 * @param event - API Gateway event
 * @returns User ID string
 * @throws AuthenticationError if user ID cannot be extracted
 */
export const getUserId = (event: APIGatewayProxyEventV2): string => {
  return extractAuthContext(event).userId;
};

/**
 * Validate that the authenticated user owns a resource
 *
 * @param event - API Gateway event
 * @param resourceUserId - User ID from the resource
 * @returns true if the user owns the resource
 * @throws AuthenticationError if not authenticated
 */
export const isResourceOwner = (
  event: APIGatewayProxyEventV2,
  resourceUserId: string
): boolean => {
  const userId = getUserId(event);
  return userId === resourceUserId;
};
