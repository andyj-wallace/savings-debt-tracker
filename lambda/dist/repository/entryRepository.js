"use strict";
/**
 * Entry Repository
 *
 * Data access layer for entry entities in DynamoDB.
 * Story 6.6: Data Access Layer
 *
 * @fileoverview Entry CRUD operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.listEntriesByDateRange = exports.listEntries = exports.createEntry = void 0;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
const dynamodb_1 = require("../utils/dynamodb");
const keys_1 = require("../types/keys");
/**
 * Create a new entry and update tracker/summary
 */
const createEntry = async (input) => {
    const tableName = (0, dynamodb_1.getTableName)();
    const entryId = (0, uuid_1.v4)();
    const now = new Date().toISOString();
    const item = {
        PK: (0, keys_1.userPK)(input.userId),
        SK: (0, keys_1.entrySK)(input.trackerId, now),
        entityType: 'ENTRY',
        entryId,
        trackerId: input.trackerId,
        userId: input.userId,
        amount: input.amount,
        type: input.type,
        note: input.note,
        runningTotal: input.runningTotal,
        days: input.days,
        createdAt: now,
    };
    // Write the entry
    await dynamodb_1.docClient.send(new lib_dynamodb_1.PutCommand({
        TableName: tableName,
        Item: item,
    }));
    // Update the tracker's currentAmount
    await dynamodb_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
        TableName: tableName,
        Key: {
            PK: (0, keys_1.userPK)(input.userId),
            SK: (0, keys_1.trackerSK)(input.trackerId),
        },
        UpdateExpression: 'SET currentAmount = :currentAmount, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
            ':currentAmount': input.runningTotal,
            ':updatedAt': now,
        },
    }));
    // Update the summary
    await updateSummaryOnEntryCreate(input.userId, input.trackerId, input.amount, input.type, now);
    return item;
};
exports.createEntry = createEntry;
/**
 * Update summary when an entry is created
 */
const updateSummaryOnEntryCreate = async (userId, trackerId, amount, type, timestamp) => {
    const tableName = (0, dynamodb_1.getTableName)();
    const absAmount = Math.abs(amount);
    // Build update expression based on entry type and amount direction
    let updateExpression = 'SET transactionCount = if_not_exists(transactionCount, :zero) + :one, ' +
        'updatedAt = :updatedAt, ' +
        'lastTransactionDate = :lastDate';
    const expressionAttributeValues = {
        ':zero': 0,
        ':one': 1,
        ':updatedAt': timestamp,
        ':lastDate': timestamp,
        ':amount': absAmount,
    };
    if (type === 'interest') {
        updateExpression +=
            ', totalInterest = if_not_exists(totalInterest, :zero) + :amount';
    }
    else if (amount > 0) {
        updateExpression +=
            ', totalDeposits = if_not_exists(totalDeposits, :zero) + :amount';
    }
    else {
        updateExpression +=
            ', totalWithdrawals = if_not_exists(totalWithdrawals, :zero) + :amount';
    }
    // Update largest transaction if applicable
    updateExpression +=
        ', largestTransaction = if_not_exists(largestTransaction, :zero)';
    try {
        await dynamodb_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
            TableName: tableName,
            Key: {
                PK: (0, keys_1.userPK)(userId),
                SK: (0, keys_1.summarySK)(trackerId),
            },
            UpdateExpression: updateExpression,
            ExpressionAttributeValues: expressionAttributeValues,
        }));
        // Check and update largest transaction in a separate update
        // (DynamoDB doesn't support MAX in a single update expression)
        await dynamodb_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
            TableName: tableName,
            Key: {
                PK: (0, keys_1.userPK)(userId),
                SK: (0, keys_1.summarySK)(trackerId),
            },
            UpdateExpression: 'SET largestTransaction = :amount',
            ConditionExpression: 'largestTransaction < :amount',
            ExpressionAttributeValues: {
                ':amount': absAmount,
            },
        }));
    }
    catch (error) {
        // Ignore condition check failures for largest transaction update
        if (error.name !== 'ConditionalCheckFailedException') {
            throw error;
        }
    }
};
/**
 * List entries for a tracker
 */
const listEntries = async (userId, trackerId, limit = 50, lastEvaluatedKey, ascending = false) => {
    const tableName = (0, dynamodb_1.getTableName)();
    const result = await dynamodb_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
        ExpressionAttributeValues: {
            ':pk': (0, keys_1.userPK)(userId),
            ':skPrefix': (0, keys_1.entryPrefix)(trackerId),
        },
        Limit: limit,
        ScanIndexForward: ascending, // false = descending (newest first)
        ExclusiveStartKey: lastEvaluatedKey,
    }));
    return {
        items: (result.Items || []),
        lastEvaluatedKey: result.LastEvaluatedKey,
        count: result.Count || 0,
    };
};
exports.listEntries = listEntries;
/**
 * List entries for a tracker within a date range
 */
const listEntriesByDateRange = async (userId, trackerId, startDate, endDate, limit = 50) => {
    const tableName = (0, dynamodb_1.getTableName)();
    const result = await dynamodb_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk AND SK BETWEEN :skStart AND :skEnd',
        ExpressionAttributeValues: {
            ':pk': (0, keys_1.userPK)(userId),
            ':skStart': (0, keys_1.entrySK)(trackerId, startDate),
            ':skEnd': (0, keys_1.entrySK)(trackerId, endDate),
        },
        Limit: limit,
        ScanIndexForward: false, // Newest first
    }));
    return {
        items: (result.Items || []),
        lastEvaluatedKey: result.LastEvaluatedKey,
        count: result.Count || 0,
    };
};
exports.listEntriesByDateRange = listEntriesByDateRange;
//# sourceMappingURL=entryRepository.js.map