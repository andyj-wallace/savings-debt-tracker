/**
 * List Trackers Lambda Handler
 *
 * Story 5.3: List Trackers Lambda
 * Returns all trackers for the authenticated user.
 *
 * @fileoverview GET /trackers handler
 */

import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import {
  getUserId,
  getPaginationParams,
  paginated,
  handleError,
} from '../utils';
import { listTrackers, getTrackerSummary } from '../repository';
import type { TrackerItem, TrackerWithStats } from '../types';

/**
 * Convert tracker to API response format with stats
 */
const toResponse = (
  tracker: TrackerItem,
  summary?: Awaited<ReturnType<typeof getTrackerSummary>>
): TrackerWithStats => {
  const { PK, SK, entityType, ...rest } = tracker;
  const response: TrackerWithStats = {
    ...rest,
    percentage:
      rest.goalAmount > 0
        ? Math.min(100, (rest.currentAmount / rest.goalAmount) * 100)
        : 0,
    remaining: Math.max(0, rest.goalAmount - rest.currentAmount),
  };

  if (summary) {
    const { PK: sPK, SK: sSK, entityType: sEntityType, ...summaryRest } = summary;
    response.summary = summaryRest;
  }

  return response;
};

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    // Extract user ID from JWT
    const userId = getUserId(event);

    // Get pagination parameters
    const { limit, nextToken } = getPaginationParams(event);

    // List trackers
    const result = await listTrackers(userId, limit, nextToken);

    // Enrich with summaries (in parallel)
    const trackersWithStats = await Promise.all(
      result.items.map(async (tracker) => {
        const summary = await getTrackerSummary(userId, tracker.trackerId);
        return toResponse(tracker, summary);
      })
    );

    console.info('Trackers listed', {
      userId,
      count: result.count,
    });

    return paginated(trackersWithStats, result.lastEvaluatedKey, result.count);
  } catch (error) {
    return handleError(error, { requestId: event.requestContext?.requestId });
  }
};
