/**
 * Data Isolation Validation Tests
 *
 * Story 8.2: Verifies that users can only access their own data.
 * All handlers scope DynamoDB queries by the authenticated user's ID,
 * so another user's requests should return 404 (not 403) for security.
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyResult } from 'aws-lambda';

// Mock DynamoDB before importing handlers
const mockSend = jest.fn();
jest.mock('../../utils/dynamodb', () => ({
  docClient: { send: (...args: unknown[]) => mockSend(...args) },
  getTableName: () => 'test-table',
}));

jest.mock('uuid', () => ({ v4: () => 'test-uuid-1234' }));

import { handler as getTrackerHandler } from '../getTracker';
import { handler as listTrackersHandler } from '../listTrackers';
import { handler as updateTrackerHandler } from '../updateTracker';
import { handler as deleteTrackerHandler } from '../deleteTracker';
import { handler as createEntryHandler } from '../createEntry';
import { handler as listEntriesHandler } from '../listEntries';

const USER_A = 'user-aaa-111';
const USER_B = 'user-bbb-222';
const TRACKER_ID = 'tracker-owned-by-a';

/**
 * Build a mock API Gateway event with JWT claims for the given user.
 */
function mockEvent(
  userId: string,
  overrides: Partial<APIGatewayProxyEventV2> = {}
): APIGatewayProxyEventV2 {
  return {
    version: '2.0',
    routeKey: 'GET /trackers',
    rawPath: '/trackers',
    rawQueryString: '',
    headers: {},
    requestContext: {
      accountId: '123456789',
      apiId: 'test-api',
      authorizer: {
        jwt: {
          claims: { sub: userId, email: `${userId}@test.com` },
          scopes: [],
        },
      },
      domainName: 'test.execute-api.us-east-1.amazonaws.com',
      domainPrefix: 'test',
      http: {
        method: 'GET',
        path: '/trackers',
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'test',
      },
      requestId: 'test-request-id',
      routeKey: 'GET /trackers',
      stage: '$default',
      time: '2024-01-01T00:00:00Z',
      timeEpoch: 1704067200000,
    },
    isBase64Encoded: false,
    ...overrides,
  } as APIGatewayProxyEventV2;
}

function mockEventWithPath(
  userId: string,
  trackerId: string,
  method = 'GET'
): APIGatewayProxyEventV2 {
  return mockEvent(userId, {
    pathParameters: { id: trackerId },
    rawPath: `/trackers/${trackerId}`,
    requestContext: {
      accountId: '123456789',
      apiId: 'test-api',
      authorizer: {
        jwt: {
          claims: { sub: userId },
          scopes: [],
        },
      },
      domainName: 'test.execute-api.us-east-1.amazonaws.com',
      domainPrefix: 'test',
      http: {
        method,
        path: `/trackers/${trackerId}`,
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'test',
      },
      requestId: 'test-request-id',
      routeKey: `${method} /trackers/{id}`,
      stage: '$default',
      time: '2024-01-01T00:00:00Z',
      timeEpoch: 1704067200000,
    },
  } as Partial<APIGatewayProxyEventV2>);
}

/** Cast handler result to APIGatewayProxyResult for assertions */
function asResult(result: unknown): APIGatewayProxyResult {
  return result as APIGatewayProxyResult;
}

beforeEach(() => {
  mockSend.mockReset();
});

describe('Story 8.2: Data Isolation Validation', () => {
  describe('GET /trackers/{id} — cross-user read blocked', () => {
    it('returns 404 when User B tries to read User A\'s tracker', async () => {
      // DynamoDB GetCommand returns nothing because PK=USER#user-bbb-222
      // won't match a tracker stored under PK=USER#user-aaa-111
      mockSend.mockResolvedValueOnce({ Item: undefined });

      const event = mockEventWithPath(USER_B, TRACKER_ID);
      const result = asResult(await getTrackerHandler(event));

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('returns 200 when User A reads their own tracker', async () => {
      const trackerItem = {
        PK: `USER#${USER_A}`,
        SK: `TRACKER#${TRACKER_ID}`,
        entityType: 'TRACKER',
        trackerId: TRACKER_ID,
        userId: USER_A,
        name: 'My Tracker',
        mode: 'savings',
        goalAmount: 100000,
        currentAmount: 50000,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      // GetCommand for tracker
      mockSend.mockResolvedValueOnce({ Item: trackerItem });
      // GetCommand for summary
      mockSend.mockResolvedValueOnce({ Item: undefined });
      // QueryCommand for recent entries
      mockSend.mockResolvedValueOnce({ Items: [], Count: 0 });

      const event = mockEventWithPath(USER_A, TRACKER_ID);
      const result = asResult(await getTrackerHandler(event));

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.trackerId).toBe(TRACKER_ID);
    });
  });

  describe('GET /trackers — list scoped to authenticated user', () => {
    it('User B\'s list does not include User A\'s trackers', async () => {
      // QueryCommand returns empty — User B has no trackers
      mockSend.mockResolvedValueOnce({ Items: [], Count: 0 });

      const event = mockEvent(USER_B);
      const result = asResult(await listTrackersHandler(event));

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.data.items).toHaveLength(0);

      // Verify query used User B's partition key
      const queryArgs = mockSend.mock.calls[0][0].input;
      expect(queryArgs.ExpressionAttributeValues[':pk']).toBe(`USER#${USER_B}`);
    });
  });

  describe('PUT /trackers/{id} — cross-user update blocked', () => {
    it('returns 404 when User B tries to update User A\'s tracker', async () => {
      // UpdateCommand throws ConditionalCheckFailedException because
      // PK=USER#user-bbb-222 + SK=TRACKER#tracker-owned-by-a doesn't exist
      mockSend.mockRejectedValueOnce(
        Object.assign(new Error('Condition failed'), {
          name: 'ConditionalCheckFailedException',
        })
      );

      const event = mockEventWithPath(USER_B, TRACKER_ID, 'PUT');
      (event as unknown as Record<string, unknown>).body = JSON.stringify({ name: 'Hacked' });
      const result = asResult(await updateTrackerHandler(event));

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('DELETE /trackers/{id} — cross-user delete blocked', () => {
    it('returns 404 when User B tries to delete User A\'s tracker', async () => {
      // GetCommand returns nothing for User B's PK
      mockSend.mockResolvedValueOnce({ Item: undefined });

      const event = mockEventWithPath(USER_B, TRACKER_ID, 'DELETE');
      const result = asResult(await deleteTrackerHandler(event));

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /trackers/{id}/entries — cross-user entry creation blocked', () => {
    it('returns 404 when User B tries to add entry to User A\'s tracker', async () => {
      // GetCommand for tracker returns nothing for User B
      mockSend.mockResolvedValueOnce({ Item: undefined });

      const event = mockEventWithPath(USER_B, TRACKER_ID, 'POST');
      (event as unknown as Record<string, unknown>).body = JSON.stringify({
        amount: 1000,
        type: 'transaction',
      });
      event.rawPath = `/trackers/${TRACKER_ID}/entries`;
      const result = asResult(await createEntryHandler(event));

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /trackers/{id}/entries — cross-user entry listing blocked', () => {
    it('returns 404 when User B tries to list entries for User A\'s tracker', async () => {
      // GetCommand for tracker returns nothing for User B
      mockSend.mockResolvedValueOnce({ Item: undefined });

      const event = mockEventWithPath(USER_B, TRACKER_ID, 'GET');
      event.rawPath = `/trackers/${TRACKER_ID}/entries`;
      const result = asResult(await listEntriesHandler(event));

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Security: returns 404 not 403', () => {
    it('does not reveal resource existence to unauthorized users', async () => {
      // Even though the tracker exists under User A, User B gets 404
      mockSend.mockResolvedValueOnce({ Item: undefined });

      const event = mockEventWithPath(USER_B, TRACKER_ID);
      const result = asResult(await getTrackerHandler(event));

      expect(result.statusCode).toBe(404);
      // Should NOT be 403 — that would reveal the tracker exists
      expect(result.statusCode).not.toBe(403);
    });
  });
});
