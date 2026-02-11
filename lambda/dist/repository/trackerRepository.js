"use strict";
/**
 * Tracker Repository
 *
 * Data access layer for tracker entities in DynamoDB.
 * Story 6.6: Data Access Layer
 *
 * @fileoverview Tracker CRUD operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTrackerSummary = exports.deleteTracker = exports.updateTracker = exports.listTrackers = exports.getTrackerOrThrow = exports.getTracker = exports.createTracker = void 0;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
const dynamodb_1 = require("../utils/dynamodb");
const keys_1 = require("../types/keys");
const errors_1 = require("../utils/errors");
/**
 * Create a new tracker
 */
const createTracker = async (input) => {
    const tableName = (0, dynamodb_1.getTableName)();
    const trackerId = (0, uuid_1.v4)();
    const now = new Date().toISOString();
    const item = {
        PK: (0, keys_1.userPK)(input.userId),
        SK: (0, keys_1.trackerSK)(trackerId),
        entityType: 'TRACKER',
        trackerId,
        userId: input.userId,
        name: input.name,
        mode: input.mode,
        goalAmount: input.goalAmount,
        currentAmount: input.currentAmount ?? 0,
        interestRate: input.interestRate,
        createdAt: now,
        updatedAt: now,
    };
    await dynamodb_1.docClient.send(new lib_dynamodb_1.PutCommand({
        TableName: tableName,
        Item: item,
        ConditionExpression: 'attribute_not_exists(PK)',
    }));
    // Create initial summary
    const summary = {
        PK: (0, keys_1.userPK)(input.userId),
        SK: (0, keys_1.summarySK)(trackerId),
        entityType: 'SUMMARY',
        trackerId,
        userId: input.userId,
        transactionCount: 0,
        totalDeposits: 0,
        totalWithdrawals: 0,
        totalInterest: 0,
        averageTransaction: 0,
        largestTransaction: 0,
        updatedAt: now,
    };
    await dynamodb_1.docClient.send(new lib_dynamodb_1.PutCommand({
        TableName: tableName,
        Item: summary,
    }));
    return item;
};
exports.createTracker = createTracker;
/**
 * Get a tracker by ID
 */
const getTracker = async (userId, trackerId) => {
    const tableName = (0, dynamodb_1.getTableName)();
    const result = await dynamodb_1.docClient.send(new lib_dynamodb_1.GetCommand({
        TableName: tableName,
        Key: {
            PK: (0, keys_1.userPK)(userId),
            SK: (0, keys_1.trackerSK)(trackerId),
        },
    }));
    if (!result.Item) {
        return null;
    }
    return result.Item;
};
exports.getTracker = getTracker;
/**
 * Get a tracker by ID, throwing NotFoundError if not found
 */
const getTrackerOrThrow = async (userId, trackerId) => {
    const tracker = await (0, exports.getTracker)(userId, trackerId);
    if (!tracker) {
        throw new errors_1.NotFoundError('Tracker', trackerId);
    }
    return tracker;
};
exports.getTrackerOrThrow = getTrackerOrThrow;
/**
 * List all trackers for a user
 */
const listTrackers = async (userId, limit = 50, lastEvaluatedKey) => {
    const tableName = (0, dynamodb_1.getTableName)();
    const result = await dynamodb_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
        ExpressionAttributeValues: {
            ':pk': (0, keys_1.userPK)(userId),
            ':skPrefix': keys_1.KEY_PREFIXES.TRACKER,
        },
        Limit: limit,
        ExclusiveStartKey: lastEvaluatedKey,
    }));
    return {
        items: (result.Items || []),
        lastEvaluatedKey: result.LastEvaluatedKey,
        count: result.Count || 0,
    };
};
exports.listTrackers = listTrackers;
/**
 * Update a tracker
 */
const updateTracker = async (userId, trackerId, updates) => {
    const tableName = (0, dynamodb_1.getTableName)();
    const now = new Date().toISOString();
    // Build update expression dynamically
    const updateExpressions = ['#updatedAt = :updatedAt'];
    const expressionAttributeNames = {
        '#updatedAt': 'updatedAt',
    };
    const expressionAttributeValues = {
        ':updatedAt': now,
    };
    if (updates.name !== undefined) {
        updateExpressions.push('#name = :name');
        expressionAttributeNames['#name'] = 'name';
        expressionAttributeValues[':name'] = updates.name;
    }
    if (updates.goalAmount !== undefined) {
        updateExpressions.push('goalAmount = :goalAmount');
        expressionAttributeValues[':goalAmount'] = updates.goalAmount;
    }
    if (updates.currentAmount !== undefined) {
        updateExpressions.push('currentAmount = :currentAmount');
        expressionAttributeValues[':currentAmount'] = updates.currentAmount;
    }
    if (updates.interestRate !== undefined) {
        updateExpressions.push('interestRate = :interestRate');
        expressionAttributeValues[':interestRate'] = updates.interestRate;
    }
    if (updates.lastInterestDate !== undefined) {
        updateExpressions.push('lastInterestDate = :lastInterestDate');
        expressionAttributeValues[':lastInterestDate'] = updates.lastInterestDate;
    }
    try {
        const result = await dynamodb_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
            TableName: tableName,
            Key: {
                PK: (0, keys_1.userPK)(userId),
                SK: (0, keys_1.trackerSK)(trackerId),
            },
            UpdateExpression: `SET ${updateExpressions.join(', ')}`,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ConditionExpression: 'attribute_exists(PK)',
            ReturnValues: 'ALL_NEW',
        }));
        return result.Attributes;
    }
    catch (error) {
        if (error.name === 'ConditionalCheckFailedException') {
            throw new errors_1.NotFoundError('Tracker', trackerId);
        }
        throw error;
    }
};
exports.updateTracker = updateTracker;
/**
 * Delete a tracker and all associated entries
 */
const deleteTracker = async (userId, trackerId) => {
    const tableName = (0, dynamodb_1.getTableName)();
    const pk = (0, keys_1.userPK)(userId);
    // First verify the tracker exists
    const tracker = await (0, exports.getTracker)(userId, trackerId);
    if (!tracker) {
        throw new errors_1.NotFoundError('Tracker', trackerId);
    }
    // Delete all entries for this tracker
    let lastEvaluatedKey;
    do {
        const entriesResult = await dynamodb_1.docClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: tableName,
            KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
            ExpressionAttributeValues: {
                ':pk': pk,
                ':skPrefix': (0, keys_1.entryPrefix)(trackerId),
            },
            ProjectionExpression: 'PK, SK',
            Limit: 25,
            ExclusiveStartKey: lastEvaluatedKey,
        }));
        // Delete each entry
        for (const item of entriesResult.Items || []) {
            await dynamodb_1.docClient.send(new lib_dynamodb_1.DeleteCommand({
                TableName: tableName,
                Key: {
                    PK: item.PK,
                    SK: item.SK,
                },
            }));
        }
        lastEvaluatedKey = entriesResult.LastEvaluatedKey;
    } while (lastEvaluatedKey);
    // Delete the summary
    await dynamodb_1.docClient.send(new lib_dynamodb_1.DeleteCommand({
        TableName: tableName,
        Key: {
            PK: pk,
            SK: (0, keys_1.summarySK)(trackerId),
        },
    }));
    // Delete the tracker
    await dynamodb_1.docClient.send(new lib_dynamodb_1.DeleteCommand({
        TableName: tableName,
        Key: {
            PK: pk,
            SK: (0, keys_1.trackerSK)(trackerId),
        },
    }));
};
exports.deleteTracker = deleteTracker;
/**
 * Get tracker summary
 */
const getTrackerSummary = async (userId, trackerId) => {
    const tableName = (0, dynamodb_1.getTableName)();
    const result = await dynamodb_1.docClient.send(new lib_dynamodb_1.GetCommand({
        TableName: tableName,
        Key: {
            PK: (0, keys_1.userPK)(userId),
            SK: (0, keys_1.summarySK)(trackerId),
        },
    }));
    if (!result.Item) {
        return null;
    }
    return result.Item;
};
exports.getTrackerSummary = getTrackerSummary;
//# sourceMappingURL=trackerRepository.js.map