"use strict";
/**
 * DynamoDB Key Generation Utilities
 *
 * Functions for generating consistent partition and sort keys
 * following the single-table design pattern.
 *
 * @fileoverview Key generation utilities for DynamoDB operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.summaryKey = exports.entryKey = exports.trackerKey = exports.compositeKey = exports.getEntityType = exports.extractEntryTimestamp = exports.extractTrackerId = exports.extractUserId = exports.summarySK = exports.entryPrefix = exports.entrySK = exports.trackerSK = exports.userPK = exports.KEY_PREFIXES = void 0;
/**
 * Key prefixes for entity types
 */
exports.KEY_PREFIXES = {
    USER: 'USER#',
    TRACKER: 'TRACKER#',
    ENTRY: 'ENTRY#',
    SUMMARY: 'SUMMARY#',
};
/**
 * Generate partition key for a user
 * @param userId - Cognito user ID (sub)
 * @returns Partition key string
 */
const userPK = (userId) => {
    return `${exports.KEY_PREFIXES.USER}${userId}`;
};
exports.userPK = userPK;
/**
 * Generate sort key for a tracker
 * @param trackerId - Tracker UUID
 * @returns Sort key string
 */
const trackerSK = (trackerId) => {
    return `${exports.KEY_PREFIXES.TRACKER}${trackerId}`;
};
exports.trackerSK = trackerSK;
/**
 * Generate sort key for an entry
 * @param trackerId - Associated tracker UUID
 * @param timestamp - ISO 8601 timestamp
 * @returns Sort key string
 */
const entrySK = (trackerId, timestamp) => {
    return `${exports.KEY_PREFIXES.ENTRY}${trackerId}#${timestamp}`;
};
exports.entrySK = entrySK;
/**
 * Generate sort key prefix for querying entries by tracker
 * @param trackerId - Associated tracker UUID
 * @returns Sort key prefix for begins_with query
 */
const entryPrefix = (trackerId) => {
    return `${exports.KEY_PREFIXES.ENTRY}${trackerId}#`;
};
exports.entryPrefix = entryPrefix;
/**
 * Generate sort key for a summary
 * @param trackerId - Associated tracker UUID
 * @returns Sort key string
 */
const summarySK = (trackerId) => {
    return `${exports.KEY_PREFIXES.SUMMARY}${trackerId}`;
};
exports.summarySK = summarySK;
/**
 * Extract user ID from partition key
 * @param pk - Partition key string
 * @returns User ID or null if invalid
 */
const extractUserId = (pk) => {
    if (!pk.startsWith(exports.KEY_PREFIXES.USER)) {
        return null;
    }
    return pk.slice(exports.KEY_PREFIXES.USER.length);
};
exports.extractUserId = extractUserId;
/**
 * Extract tracker ID from sort key
 * @param sk - Sort key string
 * @returns Tracker ID or null if invalid
 */
const extractTrackerId = (sk) => {
    if (sk.startsWith(exports.KEY_PREFIXES.TRACKER)) {
        return sk.slice(exports.KEY_PREFIXES.TRACKER.length);
    }
    if (sk.startsWith(exports.KEY_PREFIXES.SUMMARY)) {
        return sk.slice(exports.KEY_PREFIXES.SUMMARY.length);
    }
    if (sk.startsWith(exports.KEY_PREFIXES.ENTRY)) {
        // Format: ENTRY#<trackerId>#<timestamp>
        const parts = sk.slice(exports.KEY_PREFIXES.ENTRY.length).split('#');
        return parts[0] || null;
    }
    return null;
};
exports.extractTrackerId = extractTrackerId;
/**
 * Extract entry ID (timestamp) from sort key
 * @param sk - Sort key string
 * @returns Timestamp or null if invalid
 */
const extractEntryTimestamp = (sk) => {
    if (!sk.startsWith(exports.KEY_PREFIXES.ENTRY)) {
        return null;
    }
    // Format: ENTRY#<trackerId>#<timestamp>
    const parts = sk.slice(exports.KEY_PREFIXES.ENTRY.length).split('#');
    return parts[1] || null;
};
exports.extractEntryTimestamp = extractEntryTimestamp;
/**
 * Determine entity type from sort key
 * @param sk - Sort key string
 * @returns Entity type or null if unknown
 */
const getEntityType = (sk) => {
    if (sk.startsWith(exports.KEY_PREFIXES.TRACKER)) {
        return 'TRACKER';
    }
    if (sk.startsWith(exports.KEY_PREFIXES.ENTRY)) {
        return 'ENTRY';
    }
    if (sk.startsWith(exports.KEY_PREFIXES.SUMMARY)) {
        return 'SUMMARY';
    }
    return null;
};
exports.getEntityType = getEntityType;
/**
 * Generate composite key object for DynamoDB operations
 * @param userId - Cognito user ID
 * @param sk - Sort key
 * @returns Key object for DynamoDB
 */
const compositeKey = (userId, sk) => {
    return {
        PK: (0, exports.userPK)(userId),
        SK: sk,
    };
};
exports.compositeKey = compositeKey;
/**
 * Generate key for GetItem/DeleteItem operations on a tracker
 * @param userId - Cognito user ID
 * @param trackerId - Tracker UUID
 * @returns Key object for DynamoDB
 */
const trackerKey = (userId, trackerId) => {
    return (0, exports.compositeKey)(userId, (0, exports.trackerSK)(trackerId));
};
exports.trackerKey = trackerKey;
/**
 * Generate key for GetItem/DeleteItem operations on an entry
 * @param userId - Cognito user ID
 * @param trackerId - Tracker UUID
 * @param timestamp - Entry timestamp
 * @returns Key object for DynamoDB
 */
const entryKey = (userId, trackerId, timestamp) => {
    return (0, exports.compositeKey)(userId, (0, exports.entrySK)(trackerId, timestamp));
};
exports.entryKey = entryKey;
/**
 * Generate key for GetItem/DeleteItem operations on a summary
 * @param userId - Cognito user ID
 * @param trackerId - Tracker UUID
 * @returns Key object for DynamoDB
 */
const summaryKey = (userId, trackerId) => {
    return (0, exports.compositeKey)(userId, (0, exports.summarySK)(trackerId));
};
exports.summaryKey = summaryKey;
//# sourceMappingURL=keys.js.map