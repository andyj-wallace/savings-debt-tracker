# Debt Tracker - DynamoDB Schema Documentation

## Overview

This document describes the DynamoDB single-table design for the Debt Tracker application.

## Table Configuration

| Property | Value |
|----------|-------|
| Table Name | `debt-tracker-data` |
| Partition Key | `PK` (String) |
| Sort Key | `SK` (String) |
| Billing Mode | On-Demand (PAY_PER_REQUEST) |
| Encryption | AWS-managed (default) |
| Point-in-Time Recovery | Enabled |

## Entity Types

### 1. Tracker

A tracker represents a savings goal or debt payoff target for a user.

**Key Pattern:**
- PK: `USER#<userId>`
- SK: `TRACKER#<trackerId>`

**Attributes:**

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| PK | String | Yes | Partition key: `USER#<userId>` |
| SK | String | Yes | Sort key: `TRACKER#<trackerId>` |
| entityType | String | Yes | Always `"TRACKER"` |
| trackerId | String | Yes | UUID for the tracker |
| userId | String | Yes | Cognito user ID |
| name | String | Yes | Display name for the tracker |
| mode | String | Yes | `"savings"` or `"debt"` |
| goalAmount | Number | Yes | Target amount (in cents) |
| currentAmount | Number | Yes | Current balance (in cents) |
| interestRate | Number | No | Annual interest rate (percentage, e.g., 18.99) |
| lastInterestDate | String | No | ISO 8601 date of last interest application |
| createdAt | String | Yes | ISO 8601 timestamp |
| updatedAt | String | Yes | ISO 8601 timestamp |

**Example:**
```json
{
  "PK": "USER#abc123",
  "SK": "TRACKER#550e8400-e29b-41d4-a716-446655440000",
  "entityType": "TRACKER",
  "trackerId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "abc123",
  "name": "Credit Card Payoff",
  "mode": "debt",
  "goalAmount": 500000,
  "currentAmount": 350000,
  "interestRate": 18.99,
  "lastInterestDate": "2024-01-15T00:00:00.000Z",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-20T12:30:00.000Z"
}
```

---

### 2. Entry (Transaction)

An entry represents a single transaction (payment, deposit, or interest charge).

**Key Pattern:**
- PK: `USER#<userId>`
- SK: `ENTRY#<trackerId>#<timestamp>`

The timestamp in SK enables efficient time-range queries and ensures chronological ordering.

**Attributes:**

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| PK | String | Yes | Partition key: `USER#<userId>` |
| SK | String | Yes | Sort key: `ENTRY#<trackerId>#<timestamp>` |
| entityType | String | Yes | Always `"ENTRY"` |
| entryId | String | Yes | UUID for the entry |
| trackerId | String | Yes | Associated tracker ID |
| userId | String | Yes | Cognito user ID |
| amount | Number | Yes | Transaction amount (in cents, positive or negative) |
| type | String | Yes | `"transaction"` or `"interest"` |
| note | String | No | Optional description |
| runningTotal | Number | Yes | Balance after this entry (in cents) |
| days | Number | No | Number of days (for interest entries) |
| createdAt | String | Yes | ISO 8601 timestamp |

**Example (Transaction):**
```json
{
  "PK": "USER#abc123",
  "SK": "ENTRY#550e8400-e29b-41d4-a716-446655440000#2024-01-20T12:30:00.000Z",
  "entityType": "ENTRY",
  "entryId": "660e8400-e29b-41d4-a716-446655440001",
  "trackerId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "abc123",
  "amount": -10000,
  "type": "transaction",
  "note": "Monthly payment",
  "runningTotal": 340000,
  "createdAt": "2024-01-20T12:30:00.000Z"
}
```

**Example (Interest):**
```json
{
  "PK": "USER#abc123",
  "SK": "ENTRY#550e8400-e29b-41d4-a716-446655440000#2024-01-31T00:00:00.000Z",
  "entityType": "ENTRY",
  "entryId": "770e8400-e29b-41d4-a716-446655440002",
  "trackerId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "abc123",
  "amount": 5432,
  "type": "interest",
  "note": "Interest charge (31 days at 18.99%)",
  "runningTotal": 345432,
  "days": 31,
  "createdAt": "2024-01-31T00:00:00.000Z"
}
```

---

### 3. Summary

A summary provides pre-computed statistics for a tracker, enabling fast dashboard loading.

**Key Pattern:**
- PK: `USER#<userId>`
- SK: `SUMMARY#<trackerId>`

**Attributes:**

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| PK | String | Yes | Partition key: `USER#<userId>` |
| SK | String | Yes | Sort key: `SUMMARY#<trackerId>` |
| entityType | String | Yes | Always `"SUMMARY"` |
| trackerId | String | Yes | Associated tracker ID |
| userId | String | Yes | Cognito user ID |
| transactionCount | Number | Yes | Total number of transactions |
| totalDeposits | Number | Yes | Sum of positive transactions (cents) |
| totalWithdrawals | Number | Yes | Sum of negative transactions (cents) |
| totalInterest | Number | Yes | Sum of interest charges (cents) |
| averageTransaction | Number | Yes | Average transaction amount (cents) |
| largestTransaction | Number | Yes | Largest single transaction (cents) |
| lastTransactionDate | String | No | Date of most recent transaction |
| updatedAt | String | Yes | ISO 8601 timestamp |

**Example:**
```json
{
  "PK": "USER#abc123",
  "SK": "SUMMARY#550e8400-e29b-41d4-a716-446655440000",
  "entityType": "SUMMARY",
  "trackerId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "abc123",
  "transactionCount": 15,
  "totalDeposits": 0,
  "totalWithdrawals": 200000,
  "totalInterest": 50000,
  "averageTransaction": 13333,
  "largestTransaction": 50000,
  "lastTransactionDate": "2024-01-20T12:30:00.000Z",
  "updatedAt": "2024-01-20T12:30:00.000Z"
}
```

---

## Access Patterns

| Operation | PK | SK | Notes |
|-----------|----|----|-------|
| List user's trackers | `USER#<userId>` | `begins_with(TRACKER#)` | Returns all trackers |
| Get single tracker | `USER#<userId>` | `TRACKER#<trackerId>` | GetItem |
| List tracker entries | `USER#<userId>` | `begins_with(ENTRY#<trackerId>#)` | Chronological order |
| Get recent entries | `USER#<userId>` | `begins_with(ENTRY#<trackerId>#)` | ScanIndexForward=false, Limit |
| Get entries by date range | `USER#<userId>` | `between(ENTRY#<trackerId>#<start>, ENTRY#<trackerId>#<end>)` | Date range query |
| Get tracker summary | `USER#<userId>` | `SUMMARY#<trackerId>` | GetItem |

---

## Data Conventions

### Monetary Values
All monetary values are stored in **cents** (integer) to avoid floating-point precision issues.
- `$100.00` is stored as `10000`
- `$5.43` is stored as `543`

### Timestamps
All timestamps use **ISO 8601 format** with UTC timezone:
- Format: `YYYY-MM-DDTHH:mm:ss.sssZ`
- Example: `2024-01-20T12:30:00.000Z`

### IDs
- User IDs: Cognito sub (UUID format)
- Tracker/Entry IDs: UUID v4

### Interest Rates
Interest rates are stored as **percentages** (not decimals):
- `18.99%` is stored as `18.99`
- `5.25%` is stored as `5.25`

---

## Key Generation Functions

```typescript
// Generate partition key for a user
const userPK = (userId: string) => `USER#${userId}`;

// Generate sort key for a tracker
const trackerSK = (trackerId: string) => `TRACKER#${trackerId}`;

// Generate sort key for an entry
const entrySK = (trackerId: string, timestamp: string) =>
  `ENTRY#${trackerId}#${timestamp}`;

// Generate sort key for a summary
const summarySK = (trackerId: string) => `SUMMARY#${trackerId}`;
```
