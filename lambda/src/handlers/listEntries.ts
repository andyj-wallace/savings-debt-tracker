/**
 * List Entries Lambda Handler
 *
 * Story 5.6: List Entries Lambda
 * Returns entries for a tracker with pagination support.
 *
 * @fileoverview GET /trackers/{id}/entries handler
 */

import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import {
  getUserId,
  getPathParam,
  getPaginationParams,
  paginated,
  handleError,
} from '../utils';
import { getTrackerOrThrow, listEntries } from '../repository';
import type { EntryResponse } from '../types';

/**
 * Convert entry to API response format
 */
const toResponse = (
  entry: Awaited<ReturnType<typeof listEntries>>['items'][0]
): EntryResponse => {
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

    // Verify tracker exists and belongs to user
    await getTrackerOrThrow(userId, trackerId);

    // Get pagination parameters
    const { limit, nextToken } = getPaginationParams(event);

    // List entries (newest first by default)
    const result = await listEntries(userId, trackerId, limit, nextToken);

    console.info('Entries listed', {
      trackerId,
      userId,
      count: result.count,
    });

    return paginated(
      result.items.map(toResponse),
      result.lastEvaluatedKey,
      result.count
    );
  } catch (error) {
    return handleError(error, { requestId: event.requestContext?.requestId });
  }
};
