"use strict";
/**
 * DynamoDB Client Utilities
 *
 * Provides a configured DynamoDB Document Client for Lambda functions.
 *
 * @fileoverview DynamoDB client configuration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.docClient = exports.getTableName = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
/**
 * Get table name from environment variable
 */
const getTableName = () => {
    const tableName = process.env.DYNAMODB_TABLE_NAME;
    if (!tableName) {
        throw new Error('DYNAMODB_TABLE_NAME environment variable is not set');
    }
    return tableName;
};
exports.getTableName = getTableName;
/**
 * DynamoDB client configuration
 */
const clientConfig = {
    region: process.env.AWS_REGION || 'us-east-2',
};
/**
 * Raw DynamoDB client (for low-level operations)
 */
const dynamoDBClient = new client_dynamodb_1.DynamoDBClient(clientConfig);
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
exports.docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(dynamoDBClient, {
    marshallOptions,
    unmarshallOptions,
});
exports.default = exports.docClient;
//# sourceMappingURL=dynamodb.js.map