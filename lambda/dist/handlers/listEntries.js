"use strict";
/**
 * List Entries Lambda Handler
 *
 * Story 5.6: List Entries Lambda
 * Returns entries for a tracker with pagination support.
 *
 * @fileoverview GET /trackers/{id}/entries handler
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
        await (0, repository_1.getTrackerOrThrow)(userId, trackerId);
        // Get pagination parameters
        const { limit, nextToken } = (0, utils_1.getPaginationParams)(event);
        // List entries (newest first by default)
        const result = await (0, repository_1.listEntries)(userId, trackerId, limit, nextToken);
        console.info('Entries listed', {
            trackerId,
            userId,
            count: result.count,
        });
        return (0, utils_1.paginated)(result.items.map(toResponse), result.lastEvaluatedKey, result.count);
    }
    catch (error) {
        return (0, utils_1.handleError)(error, { requestId: event.requestContext?.requestId });
    }
};
exports.handler = handler;
//# sourceMappingURL=listEntries.js.map