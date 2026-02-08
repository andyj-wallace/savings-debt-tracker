/**
 * Type Definitions Index
 *
 * Central export point for all Lambda type definitions.
 *
 * @fileoverview Type exports for Lambda functions
 */

// DynamoDB entity types
export type {
  TrackerMode,
  EntryType,
  EntityType,
  DynamoDBItem,
  TrackerItem,
  EntryItem,
  SummaryItem,
  DynamoDBEntity,
  CreateTrackerInput,
  UpdateTrackerInput,
  CreateEntryInput,
  PaginatedResult,
  ApiResponse,
  TrackerWithStats,
  EntryResponse,
} from './dynamodb';

// Key generation utilities
export {
  KEY_PREFIXES,
  userPK,
  trackerSK,
  entrySK,
  entryPrefix,
  summarySK,
  extractUserId,
  extractTrackerId,
  extractEntryTimestamp,
  getEntityType,
  compositeKey,
  trackerKey,
  entryKey,
  summaryKey,
} from './keys';
