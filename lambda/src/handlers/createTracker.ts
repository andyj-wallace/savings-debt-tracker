/**
 * Create Tracker Lambda Handler
 *
 * Story 5.2: Create Tracker Lambda
 * Creates a new savings or debt tracker for the authenticated user.
 *
 * @fileoverview POST /trackers handler
 */

import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import { getUserId, parseBody, validateCreateTrackerInput, created, handleError } from '../utils';
import { createTracker } from '../repository';
import type { TrackerWithStats } from '../types';

/**
 * Convert tracker to API response format
 */
const toResponse = (tracker: Awaited<ReturnType<typeof createTracker>>): TrackerWithStats => {
  const { PK, SK, entityType, ...rest } = tracker;
  return {
    ...rest,
    percentage: rest.goalAmount > 0
      ? Math.min(100, (rest.currentAmount / rest.goalAmount) * 100)
      : 0,
    remaining: Math.max(0, rest.goalAmount - rest.currentAmount),
  };
};

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    // Extract user ID from JWT
    const userId = getUserId(event);

    // Parse and validate request body
    const body = parseBody(event);
    const input = validateCreateTrackerInput(body);

    // Create tracker
    const tracker = await createTracker({
      ...input,
      userId,
    });

    console.info('Tracker created', {
      trackerId: tracker.trackerId,
      userId,
      mode: tracker.mode,
    });

    return created(toResponse(tracker), 'Tracker created successfully');
  } catch (error) {
    return handleError(error, { requestId: event.requestContext?.requestId });
  }
};
