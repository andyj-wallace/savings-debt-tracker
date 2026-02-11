"use strict";
/**
 * Get Tracker Lambda Handler
 *
 * Story 5.4: Get Tracker Details Lambda
 * Returns a specific tracker with recent entries for the authenticated user.
 *
 * @fileoverview GET /trackers/{id} handler
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const utils_1 = require("../utils");
const repository_1 = require("../repository");
/**
 * Convert entry to API response format
 */
const entryToResponse = (entry) => {
    const { PK, SK, entityType, ...rest } = entry;
    return rest;
};
const handler = async (event) => {
    try {
        // Extract user ID from JWT
        const userId = (0, utils_1.getUserId)(event);
        // Get tracker ID from path
        const trackerId = (0, utils_1.getPathParam)(event, 'id');
        // Get tracker (throws NotFoundError if not found or doesn't belong to user)
        const tracker = await (0, repository_1.getTrackerOrThrow)(userId, trackerId);
        // Get summary and recent entries in parallel
        const [summary, entriesResult] = await Promise.all([
            (0, repository_1.getTrackerSummary)(userId, trackerId),
            (0, repository_1.listEntries)(userId, trackerId, 10), // Get 10 most recent entries
        ]);
        // Build response
        const { PK, SK, entityType, ...trackerRest } = tracker;
        const response = {
            ...trackerRest,
            percentage: tracker.goalAmount > 0
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
        return (0, utils_1.success)(response);
    }
    catch (error) {
        return (0, utils_1.handleError)(error, { requestId: event.requestContext?.requestId });
    }
};
exports.handler = handler;
//# sourceMappingURL=getTracker.js.map