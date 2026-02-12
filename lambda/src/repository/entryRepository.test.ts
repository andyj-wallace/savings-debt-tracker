import {
  createEntry,
  listEntries,
  listEntriesByDateRange,
  updateSummaryForEntry,
} from './entryRepository';

const mockSend = jest.fn();
jest.mock('../utils/dynamodb', () => ({
  docClient: { send: (...args: unknown[]) => mockSend(...args) },
  getTableName: () => 'test-table',
}));

jest.mock('uuid', () => ({ v4: () => 'entry-uuid-5678' }));

const USER_ID = 'user-abc';
const TRACKER_ID = 'tracker-xyz';

beforeEach(() => {
  mockSend.mockReset();
});

describe('createEntry', () => {
  it('writes entry, updates tracker currentAmount, and updates summary', async () => {
    mockSend.mockResolvedValue({});

    const result = await createEntry({
      userId: USER_ID,
      trackerId: TRACKER_ID,
      amount: -10000,
      type: 'transaction',
      note: 'Monthly payment',
      runningTotal: 340000,
    });

    expect(result.entryId).toBe('entry-uuid-5678');
    expect(result.PK).toBe(`USER#${USER_ID}`);
    expect(result.SK).toMatch(/^ENTRY#tracker-xyz#/);
    expect(result.entityType).toBe('ENTRY');
    expect(result.amount).toBe(-10000);
    expect(result.type).toBe('transaction');
    expect(result.note).toBe('Monthly payment');
    expect(result.runningTotal).toBe(340000);

    // 4 calls: put entry, update tracker, update summary, update largest
    expect(mockSend).toHaveBeenCalledTimes(4);
  });

  it('creates interest entry with days field', async () => {
    mockSend.mockResolvedValue({});

    const result = await createEntry({
      userId: USER_ID,
      trackerId: TRACKER_ID,
      amount: 5432,
      type: 'interest',
      note: 'Interest charge (31 days)',
      runningTotal: 345432,
      days: 31,
    });

    expect(result.type).toBe('interest');
    expect(result.days).toBe(31);
    expect(result.amount).toBe(5432);
  });

  it('updates tracker currentAmount to runningTotal', async () => {
    mockSend.mockResolvedValue({});

    await createEntry({
      userId: USER_ID,
      trackerId: TRACKER_ID,
      amount: 5000,
      type: 'transaction',
      runningTotal: 55000,
    });

    // Second call is the tracker update
    const trackerUpdateCommand = mockSend.mock.calls[1][0];
    expect(trackerUpdateCommand.input.ExpressionAttributeValues[':currentAmount']).toBe(55000);
  });
});

describe('updateSummaryForEntry', () => {
  it('increments totalDeposits for positive transactions', async () => {
    mockSend.mockResolvedValue({});

    await updateSummaryForEntry(
      USER_ID,
      TRACKER_ID,
      5000,
      'transaction',
      '2024-01-20T00:00:00.000Z'
    );

    const summaryUpdateCommand = mockSend.mock.calls[0][0];
    const expr = summaryUpdateCommand.input.UpdateExpression;
    expect(expr).toContain('totalDeposits');
    expect(expr).not.toContain('totalWithdrawals');
    expect(expr).not.toContain('totalInterest');
  });

  it('increments totalWithdrawals for negative transactions', async () => {
    mockSend.mockResolvedValue({});

    await updateSummaryForEntry(
      USER_ID,
      TRACKER_ID,
      -10000,
      'transaction',
      '2024-01-20T00:00:00.000Z'
    );

    const summaryUpdateCommand = mockSend.mock.calls[0][0];
    const expr = summaryUpdateCommand.input.UpdateExpression;
    expect(expr).toContain('totalWithdrawals');
    expect(expr).not.toContain('totalDeposits');
  });

  it('increments totalInterest for interest entries', async () => {
    mockSend.mockResolvedValue({});

    await updateSummaryForEntry(
      USER_ID,
      TRACKER_ID,
      5432,
      'interest',
      '2024-01-31T00:00:00.000Z'
    );

    const summaryUpdateCommand = mockSend.mock.calls[0][0];
    const expr = summaryUpdateCommand.input.UpdateExpression;
    expect(expr).toContain('totalInterest');
    expect(expr).not.toContain('totalDeposits');
    expect(expr).not.toContain('totalWithdrawals');
  });

  it('swallows ConditionalCheckFailedException for largest transaction', async () => {
    // First call (summary update) succeeds
    mockSend.mockResolvedValueOnce({});
    // Second call (largest transaction) fails condition
    mockSend.mockRejectedValueOnce(
      Object.assign(new Error('Condition failed'), {
        name: 'ConditionalCheckFailedException',
      })
    );

    // Should not throw
    await updateSummaryForEntry(
      USER_ID,
      TRACKER_ID,
      100,
      'transaction',
      '2024-01-20T00:00:00.000Z'
    );
  });

  it('re-throws non-conditional errors', async () => {
    mockSend.mockResolvedValueOnce({});
    mockSend.mockRejectedValueOnce(new Error('Network error'));

    await expect(
      updateSummaryForEntry(
        USER_ID,
        TRACKER_ID,
        100,
        'transaction',
        '2024-01-20T00:00:00.000Z'
      )
    ).rejects.toThrow('Network error');
  });
});

describe('listEntries', () => {
  it('queries entries for a tracker in descending order by default', async () => {
    const items = [
      { entryId: '1', amount: -5000 },
      { entryId: '2', amount: -3000 },
    ];

    mockSend.mockResolvedValue({
      Items: items,
      Count: 2,
      LastEvaluatedKey: undefined,
    });

    const result = await listEntries(USER_ID, TRACKER_ID);

    expect(result.items).toEqual(items);
    expect(result.count).toBe(2);

    const sentCommand = mockSend.mock.calls[0][0];
    expect(sentCommand.input.ScanIndexForward).toBe(false);
  });

  it('supports ascending order', async () => {
    mockSend.mockResolvedValue({ Items: [], Count: 0 });

    await listEntries(USER_ID, TRACKER_ID, 50, undefined, true);

    const sentCommand = mockSend.mock.calls[0][0];
    expect(sentCommand.input.ScanIndexForward).toBe(true);
  });

  it('passes pagination parameters', async () => {
    mockSend.mockResolvedValue({ Items: [], Count: 0 });

    const lastKey = { PK: 'USER#test', SK: 'ENTRY#abc#2024-01-01' };
    await listEntries(USER_ID, TRACKER_ID, 25, lastKey);

    const sentCommand = mockSend.mock.calls[0][0];
    expect(sentCommand.input.Limit).toBe(25);
    expect(sentCommand.input.ExclusiveStartKey).toEqual(lastKey);
  });

  it('returns empty array when no entries exist', async () => {
    mockSend.mockResolvedValue({ Items: undefined, Count: 0 });

    const result = await listEntries(USER_ID, TRACKER_ID);
    expect(result.items).toEqual([]);
    expect(result.count).toBe(0);
  });
});

describe('listEntriesByDateRange', () => {
  it('queries entries between start and end dates', async () => {
    const items = [{ entryId: '1', amount: -5000 }];
    mockSend.mockResolvedValue({ Items: items, Count: 1 });

    const result = await listEntriesByDateRange(
      USER_ID,
      TRACKER_ID,
      '2024-01-01T00:00:00.000Z',
      '2024-01-31T23:59:59.999Z'
    );

    expect(result.items).toEqual(items);

    const sentCommand = mockSend.mock.calls[0][0];
    expect(sentCommand.input.KeyConditionExpression).toContain('BETWEEN');
    expect(sentCommand.input.ScanIndexForward).toBe(false);
  });
});
