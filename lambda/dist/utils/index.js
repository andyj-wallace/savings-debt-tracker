"use strict";
/**
 * Utilities Index
 *
 * Central export point for all utility modules.
 *
 * @fileoverview Utility exports
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCreateEntryInput = exports.validateUpdateTrackerInput = exports.validateCreateTrackerInput = exports.validateOptionalString = exports.validateRequiredString = exports.validateInterestRate = exports.validatePositiveAmount = exports.validateAmount = exports.validateEntryType = exports.validateMode = exports.getPaginationParams = exports.getQueryParam = exports.getPathParam = exports.parseBody = exports.getTableName = exports.docClient = exports.isResourceOwner = exports.getUserId = exports.extractAuthContext = exports.paginated = exports.noContent = exports.created = exports.handleError = exports.error = exports.success = exports.normalizeError = exports.isOperationalError = exports.generateCorrelationId = exports.InternalError = exports.ConflictError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = exports.AppError = void 0;
// Error handling
var errors_1 = require("./errors");
Object.defineProperty(exports, "AppError", { enumerable: true, get: function () { return errors_1.AppError; } });
Object.defineProperty(exports, "ValidationError", { enumerable: true, get: function () { return errors_1.ValidationError; } });
Object.defineProperty(exports, "AuthenticationError", { enumerable: true, get: function () { return errors_1.AuthenticationError; } });
Object.defineProperty(exports, "AuthorizationError", { enumerable: true, get: function () { return errors_1.AuthorizationError; } });
Object.defineProperty(exports, "NotFoundError", { enumerable: true, get: function () { return errors_1.NotFoundError; } });
Object.defineProperty(exports, "ConflictError", { enumerable: true, get: function () { return errors_1.ConflictError; } });
Object.defineProperty(exports, "InternalError", { enumerable: true, get: function () { return errors_1.InternalError; } });
Object.defineProperty(exports, "generateCorrelationId", { enumerable: true, get: function () { return errors_1.generateCorrelationId; } });
Object.defineProperty(exports, "isOperationalError", { enumerable: true, get: function () { return errors_1.isOperationalError; } });
Object.defineProperty(exports, "normalizeError", { enumerable: true, get: function () { return errors_1.normalizeError; } });
// Response builders
var response_1 = require("./response");
Object.defineProperty(exports, "success", { enumerable: true, get: function () { return response_1.success; } });
Object.defineProperty(exports, "error", { enumerable: true, get: function () { return response_1.error; } });
Object.defineProperty(exports, "handleError", { enumerable: true, get: function () { return response_1.handleError; } });
Object.defineProperty(exports, "created", { enumerable: true, get: function () { return response_1.created; } });
Object.defineProperty(exports, "noContent", { enumerable: true, get: function () { return response_1.noContent; } });
Object.defineProperty(exports, "paginated", { enumerable: true, get: function () { return response_1.paginated; } });
// Authentication
var auth_1 = require("./auth");
Object.defineProperty(exports, "extractAuthContext", { enumerable: true, get: function () { return auth_1.extractAuthContext; } });
Object.defineProperty(exports, "getUserId", { enumerable: true, get: function () { return auth_1.getUserId; } });
Object.defineProperty(exports, "isResourceOwner", { enumerable: true, get: function () { return auth_1.isResourceOwner; } });
// DynamoDB
var dynamodb_1 = require("./dynamodb");
Object.defineProperty(exports, "docClient", { enumerable: true, get: function () { return dynamodb_1.docClient; } });
Object.defineProperty(exports, "getTableName", { enumerable: true, get: function () { return dynamodb_1.getTableName; } });
// Validation
var validation_1 = require("./validation");
Object.defineProperty(exports, "parseBody", { enumerable: true, get: function () { return validation_1.parseBody; } });
Object.defineProperty(exports, "getPathParam", { enumerable: true, get: function () { return validation_1.getPathParam; } });
Object.defineProperty(exports, "getQueryParam", { enumerable: true, get: function () { return validation_1.getQueryParam; } });
Object.defineProperty(exports, "getPaginationParams", { enumerable: true, get: function () { return validation_1.getPaginationParams; } });
Object.defineProperty(exports, "validateMode", { enumerable: true, get: function () { return validation_1.validateMode; } });
Object.defineProperty(exports, "validateEntryType", { enumerable: true, get: function () { return validation_1.validateEntryType; } });
Object.defineProperty(exports, "validateAmount", { enumerable: true, get: function () { return validation_1.validateAmount; } });
Object.defineProperty(exports, "validatePositiveAmount", { enumerable: true, get: function () { return validation_1.validatePositiveAmount; } });
Object.defineProperty(exports, "validateInterestRate", { enumerable: true, get: function () { return validation_1.validateInterestRate; } });
Object.defineProperty(exports, "validateRequiredString", { enumerable: true, get: function () { return validation_1.validateRequiredString; } });
Object.defineProperty(exports, "validateOptionalString", { enumerable: true, get: function () { return validation_1.validateOptionalString; } });
Object.defineProperty(exports, "validateCreateTrackerInput", { enumerable: true, get: function () { return validation_1.validateCreateTrackerInput; } });
Object.defineProperty(exports, "validateUpdateTrackerInput", { enumerable: true, get: function () { return validation_1.validateUpdateTrackerInput; } });
Object.defineProperty(exports, "validateCreateEntryInput", { enumerable: true, get: function () { return validation_1.validateCreateEntryInput; } });
//# sourceMappingURL=index.js.map