/**
 * DynamoDB Entity Types for Debt Tracker
 *
 * These types define the structure of items stored in the DynamoDB table.
 * All monetary values are stored in cents (integers) to avoid floating-point issues.
 * All timestamps are ISO 8601 format with UTC timezone.
 *
 * @fileoverview DynamoDB item type definitions for Lambda functions
 */

/**
 * Tracker mode - savings or debt payoff
 */
export type TrackerMode = 'savings' | 'debt';

/**
 * Entry type - regular transaction or interest charge
 */
export type EntryType = 'transaction' | 'interest';

/**
 * Entity type discriminator for single-table design
 */
export type EntityType = 'TRACKER' | 'ENTRY' | 'SUMMARY';

/**
 * Base interface for all DynamoDB items
 * Contains the partition and sort keys required for single-table design
 */
export interface DynamoDBItem {
  /** Partition key: USER#<userId> */
  PK: string;
  /** Sort key: varies by entity type */
  SK: string;
  /** Entity type discriminator */
  entityType: EntityType;
}

/**
 * Tracker entity - represents a savings goal or debt payoff target
 *
 * Key pattern:
 * - PK: USER#<userId>
 * - SK: TRACKER#<trackerId>
 */
export interface TrackerItem extends DynamoDBItem {
  entityType: 'TRACKER';

  /** UUID for the tracker */
  trackerId: string;

  /** Cognito user ID (sub) */
  userId: string;

  /** Display name for the tracker */
  name: string;

  /** Tracker mode: savings or debt */
  mode: TrackerMode;

  /** Target amount in cents */
  goalAmount: number;

  /** Current balance in cents */
  currentAmount: number;

  /** Annual interest rate as percentage (e.g., 18.99 for 18.99%) */
  interestRate?: number;

  /** ISO 8601 date of last interest application */
  lastInterestDate?: string;

  /** ISO 8601 timestamp when created */
  createdAt: string;

  /** ISO 8601 timestamp when last updated */
  updatedAt: string;
}

/**
 * Entry entity - represents a transaction or interest charge
 *
 * Key pattern:
 * - PK: USER#<userId>
 * - SK: ENTRY#<trackerId>#<timestamp>
 *
 * The timestamp in SK enables chronological queries
 */
export interface EntryItem extends DynamoDBItem {
  entityType: 'ENTRY';

  /** UUID for the entry */
  entryId: string;

  /** Associated tracker ID */
  trackerId: string;

  /** Cognito user ID (sub) */
  userId: string;

  /** Transaction amount in cents (positive or negative) */
  amount: number;

  /** Entry type: transaction or interest */
  type: EntryType;

  /** Optional description */
  note?: string;

  /** Running total after this entry in cents */
  runningTotal: number;

  /** Number of days (for interest entries) */
  days?: number;

  /** ISO 8601 timestamp when created */
  createdAt: string;
}

/**
 * Summary entity - pre-computed statistics for a tracker
 *
 * Key pattern:
 * - PK: USER#<userId>
 * - SK: SUMMARY#<trackerId>
 */
export interface SummaryItem extends DynamoDBItem {
  entityType: 'SUMMARY';

  /** Associated tracker ID */
  trackerId: string;

  /** Cognito user ID (sub) */
  userId: string;

  /** Total number of transactions */
  transactionCount: number;

  /** Sum of positive transactions in cents */
  totalDeposits: number;

  /** Sum of negative transactions in cents (stored as positive) */
  totalWithdrawals: number;

  /** Sum of interest charges in cents */
  totalInterest: number;

  /** Average transaction amount in cents */
  averageTransaction: number;

  /** Largest single transaction in cents */
  largestTransaction: number;

  /** ISO 8601 date of most recent transaction */
  lastTransactionDate?: string;

  /** ISO 8601 timestamp when last updated */
  updatedAt: string;
}

/**
 * Union type for all DynamoDB entities
 */
export type DynamoDBEntity = TrackerItem | EntryItem | SummaryItem;

/**
 * Input type for creating a new tracker (without generated fields)
 */
export interface CreateTrackerInput {
  userId: string;
  name: string;
  mode: TrackerMode;
  goalAmount: number;
  currentAmount?: number;
  interestRate?: number;
}

/**
 * Input type for updating a tracker
 */
export interface UpdateTrackerInput {
  name?: string;
  mode?: TrackerMode;
  goalAmount?: number;
  currentAmount?: number;
  interestRate?: number;
  lastInterestDate?: string;
}

/**
 * Input type for creating a new entry
 */
export interface CreateEntryInput {
  userId: string;
  trackerId: string;
  amount: number;
  type: EntryType;
  note?: string;
  runningTotal: number;
  days?: number;
}

/**
 * Query result for paginated responses
 */
export interface PaginatedResult<T> {
  items: T[];
  lastEvaluatedKey?: Record<string, unknown>;
  count: number;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Tracker with computed statistics (for API responses)
 */
export interface TrackerWithStats extends Omit<TrackerItem, 'PK' | 'SK' | 'entityType'> {
  /** Progress percentage (0-100) */
  percentage: number;

  /** Amount remaining to reach goal in cents */
  remaining: number;

  /** Associated summary if available */
  summary?: Omit<SummaryItem, 'PK' | 'SK' | 'entityType'>;
}

/**
 * Entry without DynamoDB keys (for API responses)
 */
export type EntryResponse = Omit<EntryItem, 'PK' | 'SK' | 'entityType'>;
