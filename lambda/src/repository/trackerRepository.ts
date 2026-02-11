/**
 * Tracker Repository
 *
 * Data access layer for tracker entities in DynamoDB.
 * Story 6.6: Data Access Layer
 *
 * @fileoverview Tracker CRUD operations
 */

import {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { docClient, getTableName } from '../utils/dynamodb';
import {
  userPK,
  trackerSK,
  summarySK,
  entryPrefix,
  KEY_PREFIXES,
} from '../types/keys';
import type {
  TrackerItem,
  SummaryItem,
  CreateTrackerInput,
  UpdateTrackerInput,
  PaginatedResult,
} from '../types';
import { NotFoundError } from '../utils/errors';

/**
 * Create a new tracker
 */
export const createTracker = async (
  input: CreateTrackerInput
): Promise<TrackerItem> => {
  const tableName = getTableName();
  const trackerId = uuidv4();
  const now = new Date().toISOString();

  const item: TrackerItem = {
    PK: userPK(input.userId),
    SK: trackerSK(trackerId),
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

  await docClient.send(
    new PutCommand({
      TableName: tableName,
      Item: item,
      ConditionExpression: 'attribute_not_exists(PK)',
    })
  );

  // Create initial summary
  const summary: SummaryItem = {
    PK: userPK(input.userId),
    SK: summarySK(trackerId),
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

  await docClient.send(
    new PutCommand({
      TableName: tableName,
      Item: summary,
    })
  );

  return item;
};

/**
 * Get a tracker by ID
 */
export const getTracker = async (
  userId: string,
  trackerId: string
): Promise<TrackerItem | null> => {
  const tableName = getTableName();

  const result = await docClient.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        PK: userPK(userId),
        SK: trackerSK(trackerId),
      },
    })
  );

  if (!result.Item) {
    return null;
  }

  return result.Item as TrackerItem;
};

/**
 * Get a tracker by ID, throwing NotFoundError if not found
 */
export const getTrackerOrThrow = async (
  userId: string,
  trackerId: string
): Promise<TrackerItem> => {
  const tracker = await getTracker(userId, trackerId);
  if (!tracker) {
    throw new NotFoundError('Tracker', trackerId);
  }
  return tracker;
};

/**
 * List all trackers for a user
 */
export const listTrackers = async (
  userId: string,
  limit = 50,
  lastEvaluatedKey?: Record<string, unknown>
): Promise<PaginatedResult<TrackerItem>> => {
  const tableName = getTableName();

  const result = await docClient.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': userPK(userId),
        ':skPrefix': KEY_PREFIXES.TRACKER,
      },
      Limit: limit,
      ExclusiveStartKey: lastEvaluatedKey as Record<string, unknown> | undefined,
    })
  );

  return {
    items: (result.Items || []) as TrackerItem[],
    lastEvaluatedKey: result.LastEvaluatedKey as Record<string, unknown> | undefined,
    count: result.Count || 0,
  };
};

/**
 * Update a tracker
 */
export const updateTracker = async (
  userId: string,
  trackerId: string,
  updates: UpdateTrackerInput
): Promise<TrackerItem> => {
  const tableName = getTableName();
  const now = new Date().toISOString();

  // Build update expression dynamically
  const updateExpressions: string[] = ['#updatedAt = :updatedAt'];
  const expressionAttributeNames: Record<string, string> = {
    '#updatedAt': 'updatedAt',
  };
  const expressionAttributeValues: Record<string, unknown> = {
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
    const result = await docClient.send(
      new UpdateCommand({
        TableName: tableName,
        Key: {
          PK: userPK(userId),
          SK: trackerSK(trackerId),
        },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ConditionExpression: 'attribute_exists(PK)',
        ReturnValues: 'ALL_NEW',
      })
    );

    return result.Attributes as TrackerItem;
  } catch (error) {
    if ((error as Error).name === 'ConditionalCheckFailedException') {
      throw new NotFoundError('Tracker', trackerId);
    }
    throw error;
  }
};

/**
 * Delete a tracker and all associated entries
 */
export const deleteTracker = async (
  userId: string,
  trackerId: string
): Promise<void> => {
  const tableName = getTableName();
  const pk = userPK(userId);

  // First verify the tracker exists
  const tracker = await getTracker(userId, trackerId);
  if (!tracker) {
    throw new NotFoundError('Tracker', trackerId);
  }

  // Delete all entries for this tracker
  let lastEvaluatedKey: Record<string, unknown> | undefined;
  do {
    const entriesResult = await docClient.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
        ExpressionAttributeValues: {
          ':pk': pk,
          ':skPrefix': entryPrefix(trackerId),
        },
        ProjectionExpression: 'PK, SK',
        Limit: 25,
        ExclusiveStartKey: lastEvaluatedKey,
      })
    );

    // Delete each entry
    for (const item of entriesResult.Items || []) {
      await docClient.send(
        new DeleteCommand({
          TableName: tableName,
          Key: {
            PK: item.PK as string,
            SK: item.SK as string,
          },
        })
      );
    }

    lastEvaluatedKey = entriesResult.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastEvaluatedKey);

  // Delete the summary
  await docClient.send(
    new DeleteCommand({
      TableName: tableName,
      Key: {
        PK: pk,
        SK: summarySK(trackerId),
      },
    })
  );

  // Delete the tracker
  await docClient.send(
    new DeleteCommand({
      TableName: tableName,
      Key: {
        PK: pk,
        SK: trackerSK(trackerId),
      },
    })
  );
};

/**
 * Get tracker summary
 */
export const getTrackerSummary = async (
  userId: string,
  trackerId: string
): Promise<SummaryItem | null> => {
  const tableName = getTableName();

  const result = await docClient.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        PK: userPK(userId),
        SK: summarySK(trackerId),
      },
    })
  );

  if (!result.Item) {
    return null;
  }

  return result.Item as SummaryItem;
};
