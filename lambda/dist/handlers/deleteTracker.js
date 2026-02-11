"use strict";
/**
 * Delete Tracker Lambda Handler
 *
 * Story 5.8: Delete Tracker Lambda
 * Deletes a tracker and all associated entries for the authenticated user.
 *
 * @fileoverview DELETE /trackers/{id} handler
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const utils_1 = require("../utils");
const repository_1 = require("../repository");
const handler = async (event) => {
    try {
        // Extract user ID from JWT
        const userId = (0, utils_1.getUserId)(event);
        // Get tracker ID from path
        const trackerId = (0, utils_1.getPathParam)(event, 'id');
        // Delete tracker and all entries (throws NotFoundError if not found)
        await (0, repository_1.deleteTracker)(userId, trackerId);
        console.info('Tracker deleted', {
            trackerId,
            userId,
        });
        return (0, utils_1.noContent)();
    }
    catch (error) {
        return (0, utils_1.handleError)(error, { requestId: event.requestContext?.requestId });
    }
};
exports.handler = handler;
//# sourceMappingURL=deleteTracker.js.map