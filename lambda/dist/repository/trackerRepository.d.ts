/**
 * Tracker Repository
 *
 * Data access layer for tracker entities in DynamoDB.
 * Story 6.6: Data Access Layer
 *
 * @fileoverview Tracker CRUD operations
 */
import type { TrackerItem, SummaryItem, CreateTrackerInput, UpdateTrackerInput, PaginatedResult } from '../types';
/**
 * Create a new tracker
 */
export declare const createTracker: (input: CreateTrackerInput) => Promise<TrackerItem>;
/**
 * Get a tracker by ID
 */
export declare const getTracker: (userId: string, trackerId: string) => Promise<TrackerItem | null>;
/**
 * Get a tracker by ID, throwing NotFoundError if not found
 */
export declare const getTrackerOrThrow: (userId: string, trackerId: string) => Promise<TrackerItem>;
/**
 * List all trackers for a user
 */
export declare const listTrackers: (userId: string, limit?: number, lastEvaluatedKey?: Record<string, unknown>) => Promise<PaginatedResult<TrackerItem>>;
/**
 * Update a tracker
 */
export declare const updateTracker: (userId: string, trackerId: string, updates: UpdateTrackerInput) => Promise<TrackerItem>;
/**
 * Delete a tracker and all associated entries
 */
export declare const deleteTracker: (userId: string, trackerId: string) => Promise<void>;
/**
 * Get tracker summary
 */
export declare const getTrackerSummary: (userId: string, trackerId: string) => Promise<SummaryItem | null>;
//# sourceMappingURL=trackerRepository.d.ts.map