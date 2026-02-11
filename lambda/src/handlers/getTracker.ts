/**
 * Get Tracker Lambda Handler
 *
 * Story 5.4: Get Tracker Details Lambda
 * Returns a specific tracker with recent entries for the authenticated user.
 *
 * @fileoverview GET /trackers/{id} handler
 */

import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import {
  getUserId,
  getPathParam,
  success,
  handleError,
} from '../utils';
import { getTrackerOrThrow, getTrackerSummary, listEntries } from '../repository';
import type { TrackerWithStats, EntryResponse } from '../types';

/**
 * Convert entry to API response format
 */
const entryToResponse = (entry: Awaited<ReturnType<typeof listEntries>>['items'][0]): EntryResponse => {
  const { PK, SK, entityType, ...rest } = entry;
  return rest;
};

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    // Extract user ID from JWT
    const userId = getUserId(event);

    // Get tracker ID from path
    const trackerId = getPathParam(event, 'id');

    // Get tracker (throws NotFoundError if not found or doesn't belong to user)
    const tracker = await getTrackerOrThrow(userId, trackerId);

    // Get summary and recent entries in parallel
    const [summary, entriesResult] = await Promise.all([
      getTrackerSummary(userId, trackerId),
      listEntries(userId, trackerId, 10), // Get 10 most recent entries
    ]);

    // Build response
    const { PK, SK, entityType, ...trackerRest } = tracker;
    const response: TrackerWithStats & { recentEntries: EntryResponse[] } = {
      ...trackerRest,
      percentage:
        tracker.goalAmount > 0
          ? Math.min(100, (tracker.currentAmount / tracker.goalAmount) * 100)
          : 0,
      remaining: Math.max(0, tracker.goalAmount - tracker.currentAmount),
      recentEntries: entriesResult.items.map(entryToResponse),
    };

    if (summary) {
      const { PK: sPK, SK: sSK, entityType: sEntityType, ...summaryRest } = summary;
      response.summary = summaryRest;
    }

    console.info('Tracker retrieved', {
      trackerId,
      userId,
    });

    return success(response);
  } catch (error) {
    return handleError(error, { requestId: event.requestContext?.requestId });
  }
};
