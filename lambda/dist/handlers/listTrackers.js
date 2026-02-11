"use strict";
/**
 * List Trackers Lambda Handler
 *
 * Story 5.3: List Trackers Lambda
 * Returns all trackers for the authenticated user.
 *
 * @fileoverview GET /trackers handler
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const utils_1 = require("../utils");
const repository_1 = require("../repository");
/**
 * Convert tracker to API response format with stats
 */
const toResponse = (tracker, summary) => {
    const { PK, SK, entityType, ...rest } = tracker;
    const response = {
        ...rest,
        percentage: rest.goalAmount > 0
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
const handler = async (event) => {
    try {
        // Extract user ID from JWT
        const userId = (0, utils_1.getUserId)(event);
        // Get pagination parameters
        const { limit, nextToken } = (0, utils_1.getPaginationParams)(event);
        // List trackers
        const result = await (0, repository_1.listTrackers)(userId, limit, nextToken);
        // Enrich with summaries (in parallel)
        const trackersWithStats = await Promise.all(result.items.map(async (tracker) => {
            const summary = await (0, repository_1.getTrackerSummary)(userId, tracker.trackerId);
            return toResponse(tracker, summary);
        }));
        console.info('Trackers listed', {
            userId,
            count: result.count,
        });
        return (0, utils_1.paginated)(trackersWithStats, result.lastEvaluatedKey, result.count);
    }
    catch (error) {
        return (0, utils_1.handleError)(error, { requestId: event.requestContext?.requestId });
    }
};
exports.handler = handler;
//# sourceMappingURL=listTrackers.js.map