/**
 * Update Tracker Lambda Handler
 *
 * Story 5.7: Update Tracker Lambda
 * Updates tracker settings for the authenticated user.
 *
 * @fileoverview PUT /trackers/{id} handler
 */

import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import {
  getUserId,
  getPathParam,
  parseBody,
  validateUpdateTrackerInput,
  success,
  handleError,
} from '../utils';
import { updateTracker } from '../repository';
import type { TrackerWithStats } from '../types';

/**
 * Convert tracker to API response format
 */
const toResponse = (
  tracker: Awaited<ReturnType<typeof updateTracker>>
): TrackerWithStats => {
  const { PK, SK, entityType, ...rest } = tracker;
  return {
    ...rest,
    percentage:
      rest.goalAmount > 0
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

    // Get tracker ID from path
    const trackerId = getPathParam(event, 'id');

    // Parse and validate request body
    const body = parseBody(event);
    const updates = validateUpdateTrackerInput(body);

    // Update tracker (throws NotFoundError if not found or doesn't belong to user)
    const tracker = await updateTracker(userId, trackerId, updates);

    console.info('Tracker updated', {
      trackerId,
      userId,
      fields: Object.keys(updates),
    });

    return success(toResponse(tracker), 'Tracker updated successfully');
  } catch (error) {
    return handleError(error, { requestId: event.requestContext?.requestId });
  }
};
