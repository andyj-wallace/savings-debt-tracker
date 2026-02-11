"use strict";
/**
 * Update Tracker Lambda Handler
 *
 * Story 5.7: Update Tracker Lambda
 * Updates tracker settings for the authenticated user.
 *
 * @fileoverview PUT /trackers/{id} handler
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const utils_1 = require("../utils");
const repository_1 = require("../repository");
/**
 * Convert tracker to API response format
 */
const toResponse = (tracker) => {
    const { PK, SK, entityType, ...rest } = tracker;
    return {
        ...rest,
        percentage: rest.goalAmount > 0
            ? Math.min(100, (rest.currentAmount / rest.goalAmount) * 100)
            : 0,
        remaining: Math.max(0, rest.goalAmount - rest.currentAmount),
    };
};
const handler = async (event) => {
    try {
        // Extract user ID from JWT
        const userId = (0, utils_1.getUserId)(event);
        // Get tracker ID from path
        const trackerId = (0, utils_1.getPathParam)(event, 'id');
        // Parse and validate request body
        const body = (0, utils_1.parseBody)(event);
        const updates = (0, utils_1.validateUpdateTrackerInput)(body);
        // Update tracker (throws NotFoundError if not found or doesn't belong to user)
        const tracker = await (0, repository_1.updateTracker)(userId, trackerId, updates);
        console.info('Tracker updated', {
            trackerId,
            userId,
            fields: Object.keys(updates),
        });
        return (0, utils_1.success)(toResponse(tracker), 'Tracker updated successfully');
    }
    catch (error) {
        return (0, utils_1.handleError)(error, { requestId: event.requestContext?.requestId });
    }
};
exports.handler = handler;
//# sourceMappingURL=updateTracker.js.map