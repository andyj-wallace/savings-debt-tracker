/**
 * Input Validation Utilities
 *
 * Provides validation functions for API request payloads.
 *
 * @fileoverview Request validation utilities
 */
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import type { TrackerMode, EntryType } from '../types';
/**
 * Parse and validate JSON body from API Gateway event
 */
export declare const parseBody: <T = unknown>(event: APIGatewayProxyEventV2) => T;
/**
 * Get path parameter with validation
 */
export declare const getPathParam: (event: APIGatewayProxyEventV2, name: string) => string;
/**
 * Get optional query parameter
 */
export declare const getQueryParam: (event: APIGatewayProxyEventV2, name: string) => string | undefined;
/**
 * Get pagination parameters from query string
 */
export declare const getPaginationParams: (event: APIGatewayProxyEventV2) => {
    limit: number;
    nextToken?: Record<string, unknown>;
};
/**
 * Validate tracker mode
 */
export declare const validateMode: (mode: unknown) => TrackerMode;
/**
 * Validate entry type
 */
export declare const validateEntryType: (type: unknown) => EntryType;
/**
 * Validate amount (in cents, must be integer)
 */
export declare const validateAmount: (amount: unknown, fieldName?: string) => number;
/**
 * Validate positive amount
 */
export declare const validatePositiveAmount: (amount: unknown, fieldName?: string) => number;
/**
 * Validate interest rate (percentage, 0-100)
 */
export declare const validateInterestRate: (rate: unknown) => number;
/**
 * Validate required string field
 */
export declare const validateRequiredString: (value: unknown, fieldName: string, minLength?: number, maxLength?: number) => string;
/**
 * Validate optional string field
 */
export declare const validateOptionalString: (value: unknown, fieldName: string, maxLength?: number) => string | undefined;
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
export declare const validateCreateTrackerInput: (body: unknown) => CreateTrackerBody;
/**
 * Update tracker input validation
 */
export interface UpdateTrackerBody {
    name?: string;
    goalAmount?: number;
    currentAmount?: number;
    interestRate?: number;
}
export declare const validateUpdateTrackerInput: (body: unknown) => UpdateTrackerBody;
/**
 * Create entry input validation
 */
export interface CreateEntryBody {
    amount: number;
    type: EntryType;
    note?: string;
    days?: number;
}
export declare const validateCreateEntryInput: (body: unknown) => CreateEntryBody;
//# sourceMappingURL=validation.d.ts.map