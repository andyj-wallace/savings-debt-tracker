"use strict";
/**
 * Create Tracker Lambda Handler
 *
 * Story 5.2: Create Tracker Lambda
 * Creates a new savings or debt tracker for the authenticated user.
 *
 * @fileoverview POST /trackers handler
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
        // Parse and validate request body
        const body = (0, utils_1.parseBody)(event);
        const input = (0, utils_1.validateCreateTrackerInput)(body);
        // Create tracker
        const tracker = await (0, repository_1.createTracker)({
            ...input,
            userId,
        });
        console.info('Tracker created', {
            trackerId: tracker.trackerId,
            userId,
            mode: tracker.mode,
        });
        return (0, utils_1.created)(toResponse(tracker), 'Tracker created successfully');
    }
    catch (error) {
        return (0, utils_1.handleError)(error, { requestId: event.requestContext?.requestId });
    }
};
exports.handler = handler;
//# sourceMappingURL=createTracker.js.map