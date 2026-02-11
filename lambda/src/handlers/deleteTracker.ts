/**
 * Delete Tracker Lambda Handler
 *
 * Story 5.8: Delete Tracker Lambda
 * Deletes a tracker and all associated entries for the authenticated user.
 *
 * @fileoverview DELETE /trackers/{id} handler
 */

import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import {
  getUserId,
  getPathParam,
  noContent,
  handleError,
} from '../utils';
import { deleteTracker } from '../repository';

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    // Extract user ID from JWT
    const userId = getUserId(event);

    // Get tracker ID from path
    const trackerId = getPathParam(event, 'id');

    // Delete tracker and all entries (throws NotFoundError if not found)
    await deleteTracker(userId, trackerId);

    console.info('Tracker deleted', {
      trackerId,
      userId,
    });

    return noContent();
  } catch (error) {
    return handleError(error, { requestId: event.requestContext?.requestId });
  }
};
