/**
 * Create Entry Lambda Handler
 *
 * Story 5.5: Add Entry Lambda
 * Creates a new entry (payment, deposit, or interest) for a tracker.
 *
 * @fileoverview POST /trackers/{id}/entries handler
 */

import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from 'aws-lambda';
import {
  getUserId,
  getPathParam,
  parseBody,
  validateCreateEntryInput,
  created,
  handleError,
} from '../utils';
import { getTrackerOrThrow, createEntry } from '../repository';
import type { EntryResponse } from '../types';

/**
 * Convert entry to API response format
 */
const toResponse = (
  entry: Awaited<ReturnType<typeof createEntry>>
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
    const tracker = await getTrackerOrThrow(userId, trackerId);

    // Parse and validate request body
    const body = parseBody(event);
    const input = validateCreateEntryInput(body);

    // Calculate new running total
    const runningTotal = tracker.currentAmount + input.amount;

    // Create entry
    const entry = await createEntry({
      userId,
      trackerId,
      amount: input.amount,
      type: input.type,
      note: input.note,
      runningTotal,
      days: input.days,
    });

    console.info('Entry created', {
      entryId: entry.entryId,
      trackerId,
      userId,
      type: entry.type,
      amount: entry.amount,
    });

    return created(toResponse(entry), 'Entry created successfully');
  } catch (error) {
    return handleError(error, { requestId: event.requestContext?.requestId });
  }
};
