/**
 * Calculate Interest Lambda Handler
 *
 * Story 10.6: Interest Calculation Scheduler
 * Triggered daily by EventBridge to calculate and apply interest
 * to all active debt trackers with an interest rate.
 *
 * This handler:
 * 1. Scans DynamoDB for all TRACKER entities with an interestRate
 * 2. Calculates days since lastInterestDate (or createdAt)
 * 3. Applies daily compounding interest if >= 1 day has elapsed
 * 4. Creates an interest entry and updates the tracker
 *
 * @fileoverview Scheduled interest calculation handler
 */

import { ScanCommand, type ScanCommandInput } from '@aws-sdk/lib-dynamodb';
import { docClient, getTableName } from '../utils/dynamodb';
import { createEntry } from '../repository/entryRepository';
import { updateTracker } from '../repository/trackerRepository';
import { KEY_PREFIXES } from '../types/keys';
import type { TrackerItem } from '../types';

interface ScheduledEvent {
  source: string;
  'detail-type': string;
  time: string;
}

interface InterestResult {
  trackerId: string;
  userId: string;
  interestAmount: number;
  days: number;
  success: boolean;
  error?: string;
}

/**
 * Calculate simple daily interest.
 * Uses daily compounding: interest = balance × (annualRate / 100 / 365) × days
 *
 * All amounts are in cents.
 */
function calculateDailyInterest(balanceCents: number, annualRate: number, days: number): number {
  if (balanceCents <= 0 || annualRate <= 0 || days <= 0) return 0;

  const dailyRate = annualRate / 100 / 365;
  const interest = balanceCents * dailyRate * days;

  // Round to nearest cent
  return Math.round(interest);
}

/**
 * Calculate days between two dates.
 */
function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffMs = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Scan all trackers with an interest rate across all users.
 * Uses a DynamoDB Scan with a filter for entityType=TRACKER and interestRate exists.
 */
async function scanDebtTrackers(): Promise<TrackerItem[]> {
  const tableName = getTableName();
  const trackers: TrackerItem[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const params: ScanCommandInput = {
      TableName: tableName,
      FilterExpression:
        'entityType = :entityType AND attribute_exists(interestRate) AND interestRate > :zero AND currentAmount > :zero',
      ExpressionAttributeValues: {
        ':entityType': 'TRACKER',
        ':zero': 0,
      },
      ExclusiveStartKey: lastKey,
    };

    const result = await docClient.send(new ScanCommand(params));

    if (result.Items) {
      trackers.push(...(result.Items as TrackerItem[]));
    }

    lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);

  return trackers;
}

export const handler = async (event: ScheduledEvent): Promise<void> => {
  const now = new Date().toISOString();
  const results: InterestResult[] = [];

  console.info('Interest calculation started', { time: now, event: event['detail-type'] });

  try {
    // Scan for all debt trackers with interest rates
    const trackers = await scanDebtTrackers();
    console.info(`Found ${trackers.length} trackers with interest rates`);

    for (const tracker of trackers) {
      try {
        // Extract userId from PK (format: USER#<userId>)
        const userId = tracker.PK.replace(KEY_PREFIXES.USER, '');
        const lastDate = tracker.lastInterestDate || tracker.createdAt;
        const days = daysBetween(lastDate, now);

        // Skip if less than 1 day has elapsed
        if (days < 1) {
          console.info('Skipping tracker (< 1 day)', {
            trackerId: tracker.trackerId,
            daysSinceLastInterest: days,
          });
          continue;
        }

        // Calculate interest (all amounts in cents)
        const interestAmount = calculateDailyInterest(
          tracker.currentAmount,
          tracker.interestRate!,
          days
        );

        if (interestAmount <= 0) {
          continue;
        }

        const newBalance = tracker.currentAmount + interestAmount;

        // Create interest entry
        await createEntry({
          userId,
          trackerId: tracker.trackerId,
          amount: interestAmount,
          type: 'interest',
          note: `Interest: ${tracker.interestRate}% APR × ${days} days`,
          runningTotal: newBalance,
          days,
        });

        // Update tracker's lastInterestDate
        await updateTracker(userId, tracker.trackerId, {
          lastInterestDate: now,
        });

        results.push({
          trackerId: tracker.trackerId,
          userId,
          interestAmount,
          days,
          success: true,
        });

        console.info('Interest applied', {
          trackerId: tracker.trackerId,
          interestCents: interestAmount,
          days,
          newBalanceCents: newBalance,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('Failed to apply interest', {
          trackerId: tracker.trackerId,
          error: errorMsg,
        });

        results.push({
          trackerId: tracker.trackerId,
          userId: tracker.PK.replace(KEY_PREFIXES.USER, ''),
          interestAmount: 0,
          days: 0,
          success: false,
          error: errorMsg,
        });
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.info('Interest calculation completed', {
      totalTrackers: trackers.length,
      succeeded,
      failed,
      results,
    });

    if (failed > 0) {
      console.error(`${failed} tracker(s) failed interest calculation`);
    }
  } catch (error) {
    console.error('Interest calculation failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error; // Let Lambda retry / send to DLQ
  }
};
