/**
 * DynamoDB Client Utilities
 *
 * Provides a configured DynamoDB Document Client for Lambda functions.
 *
 * @fileoverview DynamoDB client configuration
 */
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
/**
 * Get table name from environment variable
 */
export declare const getTableName: () => string;
/**
 * DynamoDB Document Client (higher-level API)
 * Automatically handles marshalling/unmarshalling of JavaScript objects
 */
export declare const docClient: DynamoDBDocumentClient;
export default docClient;
//# sourceMappingURL=dynamodb.d.ts.map