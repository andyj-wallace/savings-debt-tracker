/**
 * Entry Repository
 *
 * Data access layer for entry entities in DynamoDB.
 * Story 6.6: Data Access Layer
 *
 * @fileoverview Entry CRUD operations
 */
import type { EntryItem, CreateEntryInput, PaginatedResult } from '../types';
/**
 * Create a new entry and update tracker/summary
 */
export declare const createEntry: (input: CreateEntryInput) => Promise<EntryItem>;
/**
 * List entries for a tracker
 */
export declare const listEntries: (userId: string, trackerId: string, limit?: number, lastEvaluatedKey?: Record<string, unknown>, ascending?: boolean) => Promise<PaginatedResult<EntryItem>>;
/**
 * List entries for a tracker within a date range
 */
export declare const listEntriesByDateRange: (userId: string, trackerId: string, startDate: string, endDate: string, limit?: number) => Promise<PaginatedResult<EntryItem>>;
//# sourceMappingURL=entryRepository.d.ts.map