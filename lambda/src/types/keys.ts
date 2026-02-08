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
export const KEY_PREFIXES = {
  USER: 'USER#',
  TRACKER: 'TRACKER#',
  ENTRY: 'ENTRY#',
  SUMMARY: 'SUMMARY#',
} as const;

/**
 * Generate partition key for a user
 * @param userId - Cognito user ID (sub)
 * @returns Partition key string
 */
export const userPK = (userId: string): string => {
  return `${KEY_PREFIXES.USER}${userId}`;
};

/**
 * Generate sort key for a tracker
 * @param trackerId - Tracker UUID
 * @returns Sort key string
 */
export const trackerSK = (trackerId: string): string => {
  return `${KEY_PREFIXES.TRACKER}${trackerId}`;
};

/**
 * Generate sort key for an entry
 * @param trackerId - Associated tracker UUID
 * @param timestamp - ISO 8601 timestamp
 * @returns Sort key string
 */
export const entrySK = (trackerId: string, timestamp: string): string => {
  return `${KEY_PREFIXES.ENTRY}${trackerId}#${timestamp}`;
};

/**
 * Generate sort key prefix for querying entries by tracker
 * @param trackerId - Associated tracker UUID
 * @returns Sort key prefix for begins_with query
 */
export const entryPrefix = (trackerId: string): string => {
  return `${KEY_PREFIXES.ENTRY}${trackerId}#`;
};

/**
 * Generate sort key for a summary
 * @param trackerId - Associated tracker UUID
 * @returns Sort key string
 */
export const summarySK = (trackerId: string): string => {
  return `${KEY_PREFIXES.SUMMARY}${trackerId}`;
};

/**
 * Extract user ID from partition key
 * @param pk - Partition key string
 * @returns User ID or null if invalid
 */
export const extractUserId = (pk: string): string | null => {
  if (!pk.startsWith(KEY_PREFIXES.USER)) {
    return null;
  }
  return pk.slice(KEY_PREFIXES.USER.length);
};

/**
 * Extract tracker ID from sort key
 * @param sk - Sort key string
 * @returns Tracker ID or null if invalid
 */
export const extractTrackerId = (sk: string): string | null => {
  if (sk.startsWith(KEY_PREFIXES.TRACKER)) {
    return sk.slice(KEY_PREFIXES.TRACKER.length);
  }
  if (sk.startsWith(KEY_PREFIXES.SUMMARY)) {
    return sk.slice(KEY_PREFIXES.SUMMARY.length);
  }
  if (sk.startsWith(KEY_PREFIXES.ENTRY)) {
    // Format: ENTRY#<trackerId>#<timestamp>
    const parts = sk.slice(KEY_PREFIXES.ENTRY.length).split('#');
    return parts[0] || null;
  }
  return null;
};

/**
 * Extract entry ID (timestamp) from sort key
 * @param sk - Sort key string
 * @returns Timestamp or null if invalid
 */
export const extractEntryTimestamp = (sk: string): string | null => {
  if (!sk.startsWith(KEY_PREFIXES.ENTRY)) {
    return null;
  }
  // Format: ENTRY#<trackerId>#<timestamp>
  const parts = sk.slice(KEY_PREFIXES.ENTRY.length).split('#');
  return parts[1] || null;
};

/**
 * Determine entity type from sort key
 * @param sk - Sort key string
 * @returns Entity type or null if unknown
 */
export const getEntityType = (
  sk: string
): 'TRACKER' | 'ENTRY' | 'SUMMARY' | null => {
  if (sk.startsWith(KEY_PREFIXES.TRACKER)) {
    return 'TRACKER';
  }
  if (sk.startsWith(KEY_PREFIXES.ENTRY)) {
    return 'ENTRY';
  }
  if (sk.startsWith(KEY_PREFIXES.SUMMARY)) {
    return 'SUMMARY';
  }
  return null;
};

/**
 * Generate composite key object for DynamoDB operations
 * @param userId - Cognito user ID
 * @param sk - Sort key
 * @returns Key object for DynamoDB
 */
export const compositeKey = (
  userId: string,
  sk: string
): { PK: string; SK: string } => {
  return {
    PK: userPK(userId),
    SK: sk,
  };
};

/**
 * Generate key for GetItem/DeleteItem operations on a tracker
 * @param userId - Cognito user ID
 * @param trackerId - Tracker UUID
 * @returns Key object for DynamoDB
 */
export const trackerKey = (
  userId: string,
  trackerId: string
): { PK: string; SK: string } => {
  return compositeKey(userId, trackerSK(trackerId));
};

/**
 * Generate key for GetItem/DeleteItem operations on an entry
 * @param userId - Cognito user ID
 * @param trackerId - Tracker UUID
 * @param timestamp - Entry timestamp
 * @returns Key object for DynamoDB
 */
export const entryKey = (
  userId: string,
  trackerId: string,
  timestamp: string
): { PK: string; SK: string } => {
  return compositeKey(userId, entrySK(trackerId, timestamp));
};

/**
 * Generate key for GetItem/DeleteItem operations on a summary
 * @param userId - Cognito user ID
 * @param trackerId - Tracker UUID
 * @returns Key object for DynamoDB
 */
export const summaryKey = (
  userId: string,
  trackerId: string
): { PK: string; SK: string } => {
  return compositeKey(userId, summarySK(trackerId));
};
