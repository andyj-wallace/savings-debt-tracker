/**
 * DynamoDB Key Generation Utilities
 *
 * Functions for generating consistent partition and sort keys
 * following the single-table design pattern.
 *
 * @fileoverview Key generation utilities for DynamoDB operations
 */
/**
 * Key prefixes for entity types
 */
export declare const KEY_PREFIXES: {
    readonly USER: "USER#";
    readonly TRACKER: "TRACKER#";
    readonly ENTRY: "ENTRY#";
    readonly SUMMARY: "SUMMARY#";
};
/**
 * Generate partition key for a user
 * @param userId - Cognito user ID (sub)
 * @returns Partition key string
 */
export declare const userPK: (userId: string) => string;
/**
 * Generate sort key for a tracker
 * @param trackerId - Tracker UUID
 * @returns Sort key string
 */
export declare const trackerSK: (trackerId: string) => string;
/**
 * Generate sort key for an entry
 * @param trackerId - Associated tracker UUID
 * @param timestamp - ISO 8601 timestamp
 * @returns Sort key string
 */
export declare const entrySK: (trackerId: string, timestamp: string) => string;
/**
 * Generate sort key prefix for querying entries by tracker
 * @param trackerId - Associated tracker UUID
 * @returns Sort key prefix for begins_with query
 */
export declare const entryPrefix: (trackerId: string) => string;
/**
 * Generate sort key for a summary
 * @param trackerId - Associated tracker UUID
 * @returns Sort key string
 */
export declare const summarySK: (trackerId: string) => string;
/**
 * Extract user ID from partition key
 * @param pk - Partition key string
 * @returns User ID or null if invalid
 */
export declare const extractUserId: (pk: string) => string | null;
/**
 * Extract tracker ID from sort key
 * @param sk - Sort key string
 * @returns Tracker ID or null if invalid
 */
export declare const extractTrackerId: (sk: string) => string | null;
/**
 * Extract entry ID (timestamp) from sort key
 * @param sk - Sort key string
 * @returns Timestamp or null if invalid
 */
export declare const extractEntryTimestamp: (sk: string) => string | null;
/**
 * Determine entity type from sort key
 * @param sk - Sort key string
 * @returns Entity type or null if unknown
 */
export declare const getEntityType: (sk: string) => "TRACKER" | "ENTRY" | "SUMMARY" | null;
/**
 * Generate composite key object for DynamoDB operations
 * @param userId - Cognito user ID
 * @param sk - Sort key
 * @returns Key object for DynamoDB
 */
export declare const compositeKey: (userId: string, sk: string) => {
    PK: string;
    SK: string;
};
/**
 * Generate key for GetItem/DeleteItem operations on a tracker
 * @param userId - Cognito user ID
 * @param trackerId - Tracker UUID
 * @returns Key object for DynamoDB
 */
export declare const trackerKey: (userId: string, trackerId: string) => {
    PK: string;
    SK: string;
};
/**
 * Generate key for GetItem/DeleteItem operations on an entry
 * @param userId - Cognito user ID
 * @param trackerId - Tracker UUID
 * @param timestamp - Entry timestamp
 * @returns Key object for DynamoDB
 */
export declare const entryKey: (userId: string, trackerId: string, timestamp: string) => {
    PK: string;
    SK: string;
};
/**
 * Generate key for GetItem/DeleteItem operations on a summary
 * @param userId - Cognito user ID
 * @param trackerId - Tracker UUID
 * @returns Key object for DynamoDB
 */
export declare const summaryKey: (userId: string, trackerId: string) => {
    PK: string;
    SK: string;
};
//# sourceMappingURL=keys.d.ts.map