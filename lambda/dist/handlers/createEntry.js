"use strict";
/**
 * Create Entry Lambda Handler
 *
 * Story 5.5: Add Entry Lambda
 * Creates a new entry (payment, deposit, or interest) for a tracker.
 *
 * @fileoverview POST /trackers/{id}/entries handler
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const utils_1 = require("../utils");
const repository_1 = require("../repository");
/**
 * Convert entry to API response format
 */
const toResponse = (entry) => {
    const { PK, SK, entityType, ...rest } = entry;
    return rest;
};
const handler = async (event) => {
    try {
        // Extract user ID from JWT
        const userId = (0, utils_1.getUserId)(event);
        // Get tracker ID from path
        const trackerId = (0, utils_1.getPathParam)(event, 'id');
        // Verify tracker exists and belongs to user
        const tracker = await (0, repository_1.getTrackerOrThrow)(userId, trackerId);
        // Parse and validate request body
        const body = (0, utils_1.parseBody)(event);
        const input = (0, utils_1.validateCreateEntryInput)(body);
        // Calculate new running total
        const runningTotal = tracker.currentAmount + input.amount;
        // Create entry
        const entry = await (0, repository_1.createEntry)({
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
        return (0, utils_1.created)(toResponse(entry), 'Entry created successfully');
    }
    catch (error) {
        return (0, utils_1.handleError)(error, { requestId: event.requestContext?.requestId });
    }
};
exports.handler = handler;
//# sourceMappingURL=createEntry.js.map