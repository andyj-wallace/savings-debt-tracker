"use strict";
/**
 * Input Validation Utilities
 *
 * Provides validation functions for API request payloads.
 *
 * @fileoverview Request validation utilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCreateEntryInput = exports.validateUpdateTrackerInput = exports.validateCreateTrackerInput = exports.validateOptionalString = exports.validateRequiredString = exports.validateInterestRate = exports.validatePositiveAmount = exports.validateAmount = exports.validateEntryType = exports.validateMode = exports.getPaginationParams = exports.getQueryParam = exports.getPathParam = exports.parseBody = void 0;
const errors_1 = require("./errors");
/**
 * Parse and validate JSON body from API Gateway event
 */
const parseBody = (event) => {
    if (!event.body) {
        throw new errors_1.ValidationError('Request body is required');
    }
    try {
        const body = event.isBase64Encoded
            ? Buffer.from(event.body, 'base64').toString('utf-8')
            : event.body;
        return JSON.parse(body);
    }
    catch {
        throw new errors_1.ValidationError('Invalid JSON in request body');
    }
};
exports.parseBody = parseBody;
/**
 * Get path parameter with validation
 */
const getPathParam = (event, name) => {
    const value = event.pathParameters?.[name];
    if (!value) {
        throw new errors_1.ValidationError(`Missing required path parameter: ${name}`);
    }
    return value;
};
exports.getPathParam = getPathParam;
/**
 * Get optional query parameter
 */
const getQueryParam = (event, name) => {
    return event.queryStringParameters?.[name];
};
exports.getQueryParam = getQueryParam;
/**
 * Get pagination parameters from query string
 */
const getPaginationParams = (event) => {
    const limitStr = (0, exports.getQueryParam)(event, 'limit');
    const nextTokenStr = (0, exports.getQueryParam)(event, 'nextToken');
    let limit = 50; // Default limit
    if (limitStr) {
        const parsed = parseInt(limitStr, 10);
        if (isNaN(parsed) || parsed < 1 || parsed > 100) {
            throw new errors_1.ValidationError('Limit must be between 1 and 100');
        }
        limit = parsed;
    }
    let nextToken;
    if (nextTokenStr) {
        try {
            nextToken = JSON.parse(Buffer.from(nextTokenStr, 'base64').toString('utf-8'));
        }
        catch {
            throw new errors_1.ValidationError('Invalid nextToken format');
        }
    }
    return { limit, nextToken };
};
exports.getPaginationParams = getPaginationParams;
/**
 * Validate tracker mode
 */
const validateMode = (mode) => {
    if (mode !== 'savings' && mode !== 'debt') {
        throw new errors_1.ValidationError('Mode must be "savings" or "debt"');
    }
    return mode;
};
exports.validateMode = validateMode;
/**
 * Validate entry type
 */
const validateEntryType = (type) => {
    if (type !== 'transaction' && type !== 'interest') {
        throw new errors_1.ValidationError('Type must be "transaction" or "interest"');
    }
    return type;
};
exports.validateEntryType = validateEntryType;
/**
 * Validate amount (in cents, must be integer)
 */
const validateAmount = (amount, fieldName = 'amount') => {
    if (typeof amount !== 'number' || !Number.isInteger(amount)) {
        throw new errors_1.ValidationError(`${fieldName} must be an integer (cents)`);
    }
    return amount;
};
exports.validateAmount = validateAmount;
/**
 * Validate positive amount
 */
const validatePositiveAmount = (amount, fieldName = 'amount') => {
    const validated = (0, exports.validateAmount)(amount, fieldName);
    if (validated <= 0) {
        throw new errors_1.ValidationError(`${fieldName} must be positive`);
    }
    return validated;
};
exports.validatePositiveAmount = validatePositiveAmount;
/**
 * Validate interest rate (percentage, 0-100)
 */
const validateInterestRate = (rate) => {
    if (typeof rate !== 'number' || rate < 0 || rate > 100) {
        throw new errors_1.ValidationError('Interest rate must be between 0 and 100');
    }
    return rate;
};
exports.validateInterestRate = validateInterestRate;
/**
 * Validate required string field
 */
const validateRequiredString = (value, fieldName, minLength = 1, maxLength = 255) => {
    if (typeof value !== 'string') {
        throw new errors_1.ValidationError(`${fieldName} must be a string`);
    }
    const trimmed = value.trim();
    if (trimmed.length < minLength) {
        throw new errors_1.ValidationError(`${fieldName} must be at least ${minLength} character(s)`);
    }
    if (trimmed.length > maxLength) {
        throw new errors_1.ValidationError(`${fieldName} must be at most ${maxLength} characters`);
    }
    return trimmed;
};
exports.validateRequiredString = validateRequiredString;
/**
 * Validate optional string field
 */
const validateOptionalString = (value, fieldName, maxLength = 500) => {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }
    if (typeof value !== 'string') {
        throw new errors_1.ValidationError(`${fieldName} must be a string`);
    }
    if (value.length > maxLength) {
        throw new errors_1.ValidationError(`${fieldName} must be at most ${maxLength} characters`);
    }
    return value;
};
exports.validateOptionalString = validateOptionalString;
const validateCreateTrackerInput = (body) => {
    if (!body || typeof body !== 'object') {
        throw new errors_1.ValidationError('Invalid request body');
    }
    const input = body;
    const errors = {};
    // Validate name
    let name;
    try {
        name = (0, exports.validateRequiredString)(input.name, 'name');
    }
    catch (e) {
        errors.name = e.message;
        name = '';
    }
    // Validate mode
    let mode;
    try {
        mode = (0, exports.validateMode)(input.mode);
    }
    catch (e) {
        errors.mode = e.message;
        mode = 'savings';
    }
    // Validate goalAmount
    let goalAmount;
    try {
        goalAmount = (0, exports.validatePositiveAmount)(input.goalAmount, 'goalAmount');
    }
    catch (e) {
        errors.goalAmount = e.message;
        goalAmount = 0;
    }
    // Validate optional currentAmount
    let currentAmount;
    if (input.currentAmount !== undefined) {
        try {
            currentAmount = (0, exports.validateAmount)(input.currentAmount, 'currentAmount');
        }
        catch (e) {
            errors.currentAmount = e.message;
        }
    }
    // Validate optional interestRate
    let interestRate;
    if (input.interestRate !== undefined) {
        try {
            interestRate = (0, exports.validateInterestRate)(input.interestRate);
        }
        catch (e) {
            errors.interestRate = e.message;
        }
    }
    if (Object.keys(errors).length > 0) {
        throw new errors_1.ValidationError('Validation failed', errors);
    }
    return {
        name,
        mode,
        goalAmount,
        currentAmount,
        interestRate,
    };
};
exports.validateCreateTrackerInput = validateCreateTrackerInput;
const validateUpdateTrackerInput = (body) => {
    if (!body || typeof body !== 'object') {
        throw new errors_1.ValidationError('Invalid request body');
    }
    const input = body;
    const errors = {};
    const result = {};
    // Validate optional name
    if (input.name !== undefined) {
        try {
            result.name = (0, exports.validateRequiredString)(input.name, 'name');
        }
        catch (e) {
            errors.name = e.message;
        }
    }
    // Validate optional goalAmount
    if (input.goalAmount !== undefined) {
        try {
            result.goalAmount = (0, exports.validatePositiveAmount)(input.goalAmount, 'goalAmount');
        }
        catch (e) {
            errors.goalAmount = e.message;
        }
    }
    // Validate optional currentAmount
    if (input.currentAmount !== undefined) {
        try {
            result.currentAmount = (0, exports.validateAmount)(input.currentAmount, 'currentAmount');
        }
        catch (e) {
            errors.currentAmount = e.message;
        }
    }
    // Validate optional interestRate
    if (input.interestRate !== undefined) {
        try {
            result.interestRate = (0, exports.validateInterestRate)(input.interestRate);
        }
        catch (e) {
            errors.interestRate = e.message;
        }
    }
    if (Object.keys(errors).length > 0) {
        throw new errors_1.ValidationError('Validation failed', errors);
    }
    if (Object.keys(result).length === 0) {
        throw new errors_1.ValidationError('At least one field must be provided for update');
    }
    return result;
};
exports.validateUpdateTrackerInput = validateUpdateTrackerInput;
const validateCreateEntryInput = (body) => {
    if (!body || typeof body !== 'object') {
        throw new errors_1.ValidationError('Invalid request body');
    }
    const input = body;
    const errors = {};
    // Validate amount (can be positive or negative)
    let amount;
    try {
        amount = (0, exports.validateAmount)(input.amount, 'amount');
        if (amount === 0) {
            throw new errors_1.ValidationError('Amount cannot be zero');
        }
    }
    catch (e) {
        errors.amount = e.message;
        amount = 0;
    }
    // Validate type
    let type;
    try {
        type = (0, exports.validateEntryType)(input.type);
    }
    catch (e) {
        errors.type = e.message;
        type = 'transaction';
    }
    // Validate optional note
    let note;
    try {
        note = (0, exports.validateOptionalString)(input.note, 'note');
    }
    catch (e) {
        errors.note = e.message;
    }
    // Validate optional days (for interest entries)
    let days;
    if (input.days !== undefined) {
        if (typeof input.days !== 'number' || !Number.isInteger(input.days) || input.days < 0) {
            errors.days = 'Days must be a non-negative integer';
        }
        else {
            days = input.days;
        }
    }
    if (Object.keys(errors).length > 0) {
        throw new errors_1.ValidationError('Validation failed', errors);
    }
    return {
        amount,
        type,
        note,
        days,
    };
};
exports.validateCreateEntryInput = validateCreateEntryInput;
//# sourceMappingURL=validation.js.map