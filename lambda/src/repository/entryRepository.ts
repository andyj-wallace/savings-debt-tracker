/**
 * Entry Repository
 *
 * Data access layer for entry entities in DynamoDB.
 * Story 6.6: Data Access Layer
 *
 * @fileoverview Entry CRUD operations
 */

import {
  PutCommand,
  UpdateCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { docClient, getTableName } from '../utils/dynamodb';
import { userPK, entrySK, entryPrefix, summarySK, trackerSK } from '../types/keys';
import type {
  EntryItem,
  CreateEntryInput,
  PaginatedResult,
} from '../types';

/**
 * Create a new entry and update tracker/summary
 */
export const createEntry = async (
  input: CreateEntryInput
): Promise<EntryItem> => {
  const tableName = getTableName();
  const entryId = uuidv4();
  const now = new Date().toISOString();

  const item: EntryItem = {
    PK: userPK(input.userId),
    SK: entrySK(input.trackerId, now),
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
  await docClient.send(
    new PutCommand({
      TableName: tableName,
      Item: item,
    })
  );

  // Update the tracker's currentAmount
  await docClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: {
        PK: userPK(input.userId),
        SK: trackerSK(input.trackerId),
      },
      UpdateExpression: 'SET currentAmount = :currentAmount, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':currentAmount': input.runningTotal,
        ':updatedAt': now,
      },
    })
  );

  // Update the summary
  await updateSummaryOnEntryCreate(
    input.userId,
    input.trackerId,
    input.amount,
    input.type,
    now
  );

  return item;
};

/**
 * Update summary when an entry is created
 */
const updateSummaryOnEntryCreate = async (
  userId: string,
  trackerId: string,
  amount: number,
  type: 'transaction' | 'interest',
  timestamp: string
): Promise<void> => {
  const tableName = getTableName();
  const absAmount = Math.abs(amount);

  // Build update expression based on entry type and amount direction
  let updateExpression =
    'SET transactionCount = if_not_exists(transactionCount, :zero) + :one, ' +
    'updatedAt = :updatedAt, ' +
    'lastTransactionDate = :lastDate';

  const expressionAttributeValues: Record<string, unknown> = {
    ':zero': 0,
    ':one': 1,
    ':updatedAt': timestamp,
    ':lastDate': timestamp,
    ':amount': absAmount,
  };

  if (type === 'interest') {
    updateExpression +=
      ', totalInterest = if_not_exists(totalInterest, :zero) + :amount';
  } else if (amount > 0) {
    updateExpression +=
      ', totalDeposits = if_not_exists(totalDeposits, :zero) + :amount';
  } else {
    updateExpression +=
      ', totalWithdrawals = if_not_exists(totalWithdrawals, :zero) + :amount';
  }

  // Update largest transaction if applicable
  updateExpression +=
    ', largestTransaction = if_not_exists(largestTransaction, :zero)';

  try {
    await docClient.send(
      new UpdateCommand({
        TableName: tableName,
        Key: {
          PK: userPK(userId),
          SK: summarySK(trackerId),
        },
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
      })
    );

    // Check and update largest transaction in a separate update
    // (DynamoDB doesn't support MAX in a single update expression)
    await docClient.send(
      new UpdateCommand({
        TableName: tableName,
        Key: {
          PK: userPK(userId),
          SK: summarySK(trackerId),
        },
        UpdateExpression: 'SET largestTransaction = :amount',
        ConditionExpression: 'largestTransaction < :amount',
        ExpressionAttributeValues: {
          ':amount': absAmount,
        },
      })
    );
  } catch (error) {
    // Ignore condition check failures for largest transaction update
    if ((error as Error).name !== 'ConditionalCheckFailedException') {
      throw error;
    }
  }
};

/**
 * List entries for a tracker
 */
export const listEntries = async (
  userId: string,
  trackerId: string,
  limit = 50,
  lastEvaluatedKey?: Record<string, unknown>,
  ascending = false
): Promise<PaginatedResult<EntryItem>> => {
  const tableName = getTableName();

  const result = await docClient.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': userPK(userId),
        ':skPrefix': entryPrefix(trackerId),
      },
      Limit: limit,
      ScanIndexForward: ascending, // false = descending (newest first)
      ExclusiveStartKey: lastEvaluatedKey as Record<string, unknown> | undefined,
    })
  );

  return {
    items: (result.Items || []) as EntryItem[],
    lastEvaluatedKey: result.LastEvaluatedKey as Record<string, unknown> | undefined,
    count: result.Count || 0,
  };
};

/**
 * List entries for a tracker within a date range
 */
export const listEntriesByDateRange = async (
  userId: string,
  trackerId: string,
  startDate: string,
  endDate: string,
  limit = 50
): Promise<PaginatedResult<EntryItem>> => {
  const tableName = getTableName();

  const result = await docClient.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression:
        'PK = :pk AND SK BETWEEN :skStart AND :skEnd',
      ExpressionAttributeValues: {
        ':pk': userPK(userId),
        ':skStart': entrySK(trackerId, startDate),
        ':skEnd': entrySK(trackerId, endDate),
      },
      Limit: limit,
      ScanIndexForward: false, // Newest first
    })
  );

  return {
    items: (result.Items || []) as EntryItem[],
    lastEvaluatedKey: result.LastEvaluatedKey as Record<string, unknown> | undefined,
    count: result.Count || 0,
  };
};
