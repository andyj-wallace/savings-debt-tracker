/**
 * DynamoDB Client Utilities
 *
 * Provides a configured DynamoDB Document Client for Lambda functions.
 *
 * @fileoverview DynamoDB client configuration
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

/**
 * Get table name from environment variable
 */
export const getTableName = (): string => {
  const tableName = process.env.DYNAMODB_TABLE_NAME;
  if (!tableName) {
    throw new Error('DYNAMODB_TABLE_NAME environment variable is not set');
  }
  return tableName;
};

/**
 * DynamoDB client configuration
 */
const clientConfig = {
  region: process.env.AWS_REGION || 'us-east-2',
};

/**
 * Raw DynamoDB client (for low-level operations)
 */
const dynamoDBClient = new DynamoDBClient(clientConfig);

/**
 * Document client marshalling options
 * - removeUndefinedValues: Automatically remove undefined values from items
 * - convertEmptyValues: Convert empty strings to null (DynamoDB doesn't support empty strings)
 */
const marshallOptions = {
  removeUndefinedValues: true,
  convertEmptyValues: false,
};

const unmarshallOptions = {
  wrapNumbers: false,
};

/**
 * DynamoDB Document Client (higher-level API)
 * Automatically handles marshalling/unmarshalling of JavaScript objects
 */
export const docClient = DynamoDBDocumentClient.from(dynamoDBClient, {
  marshallOptions,
  unmarshallOptions,
});

export default docClient;
