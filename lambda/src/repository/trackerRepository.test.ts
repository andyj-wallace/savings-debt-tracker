import {
  createTracker,
  getTracker,
  getTrackerOrThrow,
  listTrackers,
  updateTracker,
  deleteTracker,
  getTrackerSummary,
} from './trackerRepository';
import { NotFoundError } from '../utils/errors';

const mockSend = jest.fn();
jest.mock('../utils/dynamodb', () => ({
  docClient: { send: (...args: unknown[]) => mockSend(...args) },
  getTableName: () => 'test-table',
}));

jest.mock('uuid', () => ({ v4: () => 'test-uuid-1234' }));

const USER_ID = 'user-abc';
const TRACKER_ID = 'tracker-xyz';

beforeEach(() => {
  mockSend.mockReset();
});

describe('createTracker', () => {
  it('writes tracker and initial summary to DynamoDB', async () => {
    mockSend.mockResolvedValue({});

    const result = await createTracker({
      userId: USER_ID,
      name: 'Credit Card',
      mode: 'debt',
      goalAmount: 500000,
      interestRate: 18.99,
    });

    expect(result.trackerId).toBe('test-uuid-1234');
    expect(result.PK).toBe(`USER#${USER_ID}`);
    expect(result.SK).toBe('TRACKER#test-uuid-1234');
    expect(result.entityType).toBe('TRACKER');
    expect(result.name).toBe('Credit Card');
    expect(result.mode).toBe('debt');
    expect(result.goalAmount).toBe(500000);
    expect(result.currentAmount).toBe(0);
    expect(result.interestRate).toBe(18.99);

    // Two calls: PutCommand for tracker, PutCommand for summary
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('sets currentAmount from input when provided', async () => {
    mockSend.mockResolvedValue({});

    const result = await createTracker({
      userId: USER_ID,
      name: 'Savings',
      mode: 'savings',
      goalAmount: 100000,
      currentAmount: 25000,
    });

    expect(result.currentAmount).toBe(25000);
  });

  it('uses condition expression to prevent duplicates', async () => {
    mockSend.mockRejectedValueOnce(
      Object.assign(new Error('Condition failed'), {
        name: 'ConditionalCheckFailedException',
      })
    );

    await expect(
      createTracker({
        userId: USER_ID,
        name: 'Duplicate',
        mode: 'savings',
        goalAmount: 100,
      })
    ).rejects.toThrow();
  });
});

describe('getTracker', () => {
  it('returns tracker item when found', async () => {
    const trackerItem = {
      PK: `USER#${USER_ID}`,
      SK: `TRACKER#${TRACKER_ID}`,
      entityType: 'TRACKER',
      trackerId: TRACKER_ID,
      userId: USER_ID,
      name: 'Test',
      mode: 'savings',
      goalAmount: 100000,
      currentAmount: 0,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    mockSend.mockResolvedValue({ Item: trackerItem });

    const result = await getTracker(USER_ID, TRACKER_ID);
    expect(result).toEqual(trackerItem);
  });

  it('returns null when tracker not found', async () => {
    mockSend.mockResolvedValue({ Item: undefined });

    const result = await getTracker(USER_ID, 'nonexistent');
    expect(result).toBeNull();
  });
});

describe('getTrackerOrThrow', () => {
  it('returns tracker when found', async () => {
    const trackerItem = {
      PK: `USER#${USER_ID}`,
      SK: `TRACKER#${TRACKER_ID}`,
      entityType: 'TRACKER',
      trackerId: TRACKER_ID,
      userId: USER_ID,
      name: 'Test',
      mode: 'savings',
      goalAmount: 100000,
      currentAmount: 0,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    mockSend.mockResolvedValue({ Item: trackerItem });

    const result = await getTrackerOrThrow(USER_ID, TRACKER_ID);
    expect(result).toEqual(trackerItem);
  });

  it('throws NotFoundError when tracker not found', async () => {
    mockSend.mockResolvedValue({ Item: undefined });

    await expect(getTrackerOrThrow(USER_ID, 'missing')).rejects.toThrow(
      NotFoundError
    );
  });
});

describe('listTrackers', () => {
  it('queries trackers with correct key condition', async () => {
    const items = [
      { trackerId: '1', name: 'Tracker 1' },
      { trackerId: '2', name: 'Tracker 2' },
    ];

    mockSend.mockResolvedValue({
      Items: items,
      Count: 2,
      LastEvaluatedKey: undefined,
    });

    const result = await listTrackers(USER_ID);

    expect(result.items).toEqual(items);
    expect(result.count).toBe(2);
    expect(result.lastEvaluatedKey).toBeUndefined();
  });

  it('passes pagination parameters', async () => {
    mockSend.mockResolvedValue({ Items: [], Count: 0 });

    const lastKey = { PK: 'USER#test', SK: 'TRACKER#abc' };
    await listTrackers(USER_ID, 10, lastKey);

    const sentCommand = mockSend.mock.calls[0][0];
    expect(sentCommand.input.Limit).toBe(10);
    expect(sentCommand.input.ExclusiveStartKey).toEqual(lastKey);
  });

  it('returns empty array when no trackers exist', async () => {
    mockSend.mockResolvedValue({ Items: undefined, Count: 0 });

    const result = await listTrackers(USER_ID);
    expect(result.items).toEqual([]);
    expect(result.count).toBe(0);
  });
});

describe('updateTracker', () => {
  it('updates name and returns updated item', async () => {
    const updatedItem = {
      PK: `USER#${USER_ID}`,
      SK: `TRACKER#${TRACKER_ID}`,
      name: 'New Name',
    };

    mockSend.mockResolvedValue({ Attributes: updatedItem });

    const result = await updateTracker(USER_ID, TRACKER_ID, {
      name: 'New Name',
    });

    expect(result).toEqual(updatedItem);
  });

  it('updates multiple fields at once', async () => {
    mockSend.mockResolvedValue({
      Attributes: { name: 'Updated', goalAmount: 200000 },
    });

    await updateTracker(USER_ID, TRACKER_ID, {
      name: 'Updated',
      goalAmount: 200000,
      interestRate: 5.5,
    });

    const sentCommand = mockSend.mock.calls[0][0];
    const expr = sentCommand.input.UpdateExpression;
    expect(expr).toContain('#name = :name');
    expect(expr).toContain('goalAmount = :goalAmount');
    expect(expr).toContain('interestRate = :interestRate');
  });

  it('throws NotFoundError when tracker does not exist', async () => {
    mockSend.mockRejectedValue(
      Object.assign(new Error('Condition failed'), {
        name: 'ConditionalCheckFailedException',
      })
    );

    await expect(
      updateTracker(USER_ID, 'missing', { name: 'Nope' })
    ).rejects.toThrow(NotFoundError);
  });
});

describe('deleteTracker', () => {
  it('deletes tracker, entries, and summary', async () => {
    // getTracker returns the tracker
    mockSend.mockResolvedValueOnce({
      Item: { PK: `USER#${USER_ID}`, SK: `TRACKER#${TRACKER_ID}` },
    });
    // query entries returns empty (no entries to delete)
    mockSend.mockResolvedValueOnce({ Items: [], LastEvaluatedKey: undefined });
    // delete summary
    mockSend.mockResolvedValueOnce({});
    // delete tracker
    mockSend.mockResolvedValueOnce({});

    await deleteTracker(USER_ID, TRACKER_ID);

    // 4 calls: getTracker, query entries, delete summary, delete tracker
    expect(mockSend).toHaveBeenCalledTimes(4);
  });

  it('deletes associated entries before tracker', async () => {
    // getTracker
    mockSend.mockResolvedValueOnce({
      Item: { PK: `USER#${USER_ID}`, SK: `TRACKER#${TRACKER_ID}` },
    });
    // query entries returns 2 entries
    mockSend.mockResolvedValueOnce({
      Items: [
        { PK: `USER#${USER_ID}`, SK: `ENTRY#${TRACKER_ID}#2024-01-01` },
        { PK: `USER#${USER_ID}`, SK: `ENTRY#${TRACKER_ID}#2024-01-02` },
      ],
      LastEvaluatedKey: undefined,
    });
    // delete entry 1
    mockSend.mockResolvedValueOnce({});
    // delete entry 2
    mockSend.mockResolvedValueOnce({});
    // delete summary
    mockSend.mockResolvedValueOnce({});
    // delete tracker
    mockSend.mockResolvedValueOnce({});

    await deleteTracker(USER_ID, TRACKER_ID);

    // 6 calls: get, query, delete entry x2, delete summary, delete tracker
    expect(mockSend).toHaveBeenCalledTimes(6);
  });

  it('throws NotFoundError when tracker does not exist', async () => {
    mockSend.mockResolvedValueOnce({ Item: undefined });

    await expect(deleteTracker(USER_ID, 'missing')).rejects.toThrow(
      NotFoundError
    );
  });
});

describe('getTrackerSummary', () => {
  it('returns summary when found', async () => {
    const summary = {
      PK: `USER#${USER_ID}`,
      SK: `SUMMARY#${TRACKER_ID}`,
      entityType: 'SUMMARY',
      transactionCount: 5,
      totalDeposits: 50000,
    };

    mockSend.mockResolvedValue({ Item: summary });

    const result = await getTrackerSummary(USER_ID, TRACKER_ID);
    expect(result).toEqual(summary);
  });

  it('returns null when summary not found', async () => {
    mockSend.mockResolvedValue({ Item: undefined });

    const result = await getTrackerSummary(USER_ID, 'missing');
    expect(result).toBeNull();
  });
});
