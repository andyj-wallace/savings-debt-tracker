/**
 * TrackerDetail Component
 *
 * API-backed tracker detail view with stats display, entry creation,
 * entry history with pagination, and tracker deletion.
 *
 * Stories 7.5 (detail), 7.6 (add entry), 7.7 (delete tracker)
 *
 * @fileoverview Full tracker detail view for API-backed mode
 */

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, Percent } from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { formatCurrency } from '../utils/formatCurrency';
import { LABELS, MODES, CSS_CLASSES } from '../constants';
import { cardPresets } from '../styles/cardStyles';
import { inputPresets, inputLabel } from '../styles/inputStyles';
import { buttonPresets } from '../styles/buttonStyles';
import type { ApiTrackerDetail as ApiTrackerDetailType, ApiEntry } from '../types';

interface TrackerDetailProps {
  trackerId: string;
  onBack: () => void;
}

export default function TrackerDetail({ trackerId, onBack }: TrackerDetailProps) {
  // Tracker data state
  const [tracker, setTracker] = useState<ApiTrackerDetailType | null>(null);
  const [entries, setEntries] = useState<ApiEntry[]>([]);
  const [nextToken, setNextToken] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Entry form state
  const [entryAmount, setEntryAmount] = useState('');
  const [entryNote, setEntryNote] = useState('');
  const [entrySubmitting, setEntrySubmitting] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);

  // Delete state
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Load more state
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchTracker = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await apiClient.getTracker(trackerId);

    if (result.success && result.data) {
      setTracker(result.data);
      setEntries(result.data.recentEntries || []);
      // If we got exactly 10 entries (the Lambda default), there might be more
      setNextToken(result.data.recentEntries?.length === 10 ? 'initial' : undefined);
    } else {
      setError(result.error || 'Failed to load tracker.');
    }

    setLoading(false);
  }, [trackerId]);

  useEffect(() => {
    fetchTracker();
  }, [fetchTracker]);

  // Fetch more entries with pagination
  const loadMoreEntries = async () => {
    if (!nextToken) return;
    setLoadingMore(true);

    // For the initial "more" request, use the API's listEntries with explicit pagination
    const token = nextToken === 'initial' ? undefined : nextToken;
    const result = await apiClient.listEntries(trackerId, 10, token);

    if (result.success && result.data) {
      if (nextToken === 'initial') {
        // Replace with full paginated result
        setEntries(result.data.items);
      } else {
        setEntries((prev) => [...prev, ...result.data!.items]);
      }
      setNextToken(result.data.nextToken);
    }

    setLoadingMore(false);
  };

  // Add entry handler (Story 7.6)
  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setEntryError(null);

    const dollars = parseFloat(entryAmount);
    if (!entryAmount || isNaN(dollars) || dollars <= 0) {
      setEntryError('Please enter a valid amount greater than zero.');
      return;
    }

    if (!tracker) return;

    // In debt mode, payments reduce the balance (negative amount)
    const isDebt = tracker.mode === MODES.DEBT;
    const cents = Math.round(dollars * 100) * (isDebt ? -1 : 1);

    setEntrySubmitting(true);

    const result = await apiClient.createEntry(trackerId, {
      amount: cents,
      type: 'transaction',
      note: entryNote.trim() || undefined,
    });

    setEntrySubmitting(false);

    if (result.success) {
      setEntryAmount('');
      setEntryNote('');
      // Re-fetch tracker to get updated balances and entries
      await fetchTracker();
    } else {
      setEntryError(result.error || 'Failed to add entry.');
    }
  };

  // Delete tracker handler (Story 7.7)
  const handleDelete = async () => {
    if (!window.confirm(LABELS.TRACKER_DETAIL.DELETE_CONFIRM)) return;

    setDeleteError(null);
    setDeleting(true);

    const result = await apiClient.deleteTracker(trackerId);

    setDeleting(false);

    if (result.success) {
      onBack();
    } else {
      setDeleteError(result.error || 'Failed to delete tracker.');
    }
  };

  // Format date for display
  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // --- Loading state ---
  if (loading) {
    return (
      <div className={CSS_CLASSES.CONTAINERS.MAIN}>
        <div className={CSS_CLASSES.CONTAINERS.CONTENT}>
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
              <p className="text-slate-600">Loading tracker...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Error state ---
  if (error || !tracker) {
    return (
      <div className={CSS_CLASSES.CONTAINERS.MAIN}>
        <div className={CSS_CLASSES.CONTAINERS.CONTENT}>
          <div className="text-center py-20">
            <p className="text-red-600 mb-4">{error || 'Tracker not found.'}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={onBack} className={buttonPresets.formCancel()}>
                {LABELS.TRACKER_DETAIL.BACK}
              </button>
              <button onClick={fetchTracker} className={buttonPresets.formSubmit()}>
                {LABELS.TRACKER_LIST.RETRY}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isDebt = tracker.mode === MODES.DEBT;
  const goalDollars = tracker.goalAmount / 100;
  const currentDollars = tracker.currentAmount / 100;
  const remainingDollars = tracker.remaining / 100;
  const modeColor = isDebt ? 'red' : 'green';

  return (
    <div className={CSS_CLASSES.CONTAINERS.MAIN}>
      <div className={CSS_CLASSES.CONTAINERS.CONTENT}>
        {/* Back button + Header */}
        <div className="mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"
          >
            <ArrowLeft size={16} /> {LABELS.TRACKER_DETAIL.BACK}
          </button>
          <div className="flex items-center justify-between">
            <h1 className={CSS_CLASSES.TEXT.TITLE}>{tracker.name}</h1>
            <span
              className={`text-xs font-medium px-2 py-1 rounded-full ${
                isDebt ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
              }`}
            >
              {isDebt ? LABELS.TRACKER_LIST.DEBT : LABELS.TRACKER_LIST.SAVINGS}
            </span>
          </div>
        </div>

        {/* Stats card */}
        <div className={`${CSS_CLASSES.CARDS.PRIMARY} mb-6`}>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className={CSS_CLASSES.TEXT.LABEL}>{LABELS.COMMON.GOAL}</p>
              <p className={CSS_CLASSES.TEXT.VALUE}>{formatCurrency(goalDollars)}</p>
            </div>
            <div>
              <p className={CSS_CLASSES.TEXT.LABEL}>
                {isDebt ? LABELS.MODES.DEBT.REMAINING_LABEL : LABELS.MODES.SAVINGS.PROGRESS_LABEL}
              </p>
              <p className={`${CSS_CLASSES.TEXT.VALUE} text-${modeColor}-600`}>
                {formatCurrency(isDebt ? remainingDollars : currentDollars)}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-2">
            <div className="flex justify-between text-sm text-slate-600 mb-1">
              <span>{formatCurrency(currentDollars)} / {formatCurrency(goalDollars)}</span>
              <span>{Math.round(tracker.percentage)}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all bg-${modeColor}-500`}
                style={{ width: `${Math.min(100, tracker.percentage)}%` }}
              />
            </div>
          </div>

          {tracker.interestRate !== undefined && tracker.interestRate > 0 && (
            <p className={CSS_CLASSES.TEXT.SMALL_TEXT}>
              Interest Rate: {tracker.interestRate}% APR
            </p>
          )}
        </div>

        {/* Add Entry form (Story 7.6) */}
        <div className={`${CSS_CLASSES.CARDS.PRIMARY} mb-6`}>
          <h2 className={CSS_CLASSES.TEXT.SECTION_TITLE}>{LABELS.TRACKER_DETAIL.ADD_ENTRY}</h2>
          <form onSubmit={handleAddEntry}>
            <div className="flex gap-2 mb-2">
              <div className="flex-1">
                <label className={inputLabel.sr}>{LABELS.TRACKER_DETAIL.ENTRY_AMOUNT}</label>
                <input
                  type="number"
                  value={entryAmount}
                  onChange={(e) => setEntryAmount(e.target.value)}
                  placeholder={LABELS.TRACKER_DETAIL.ENTRY_AMOUNT}
                  min="0.01"
                  step="0.01"
                  className={`w-full ${inputPresets.currencyInput()}`}
                  disabled={entrySubmitting}
                />
              </div>
              <div className="flex-1">
                <label className={inputLabel.sr}>{LABELS.TRACKER_DETAIL.ENTRY_NOTE}</label>
                <input
                  type="text"
                  value={entryNote}
                  onChange={(e) => setEntryNote(e.target.value)}
                  placeholder={LABELS.TRACKER_DETAIL.ENTRY_NOTE}
                  className={`w-full ${inputPresets.formInput()}`}
                  disabled={entrySubmitting}
                />
              </div>
              <button
                type="submit"
                disabled={entrySubmitting}
                className={buttonPresets.formSubmit(entrySubmitting)}
              >
                {entrySubmitting ? LABELS.TRACKER_DETAIL.SUBMITTING : LABELS.TRACKER_DETAIL.SUBMIT_ENTRY}
              </button>
            </div>
            {entryError && (
              <p className="text-red-600 text-sm">{entryError}</p>
            )}
          </form>
        </div>

        {/* Entry history (Story 7.5) */}
        <div className={`${CSS_CLASSES.CARDS.PRIMARY} mb-6`}>
          <h2 className={CSS_CLASSES.TEXT.SECTION_TITLE}>{LABELS.TRACKER_DETAIL.ENTRY_HISTORY}</h2>

          {entries.length === 0 ? (
            <p className="text-slate-500 text-center py-4">{LABELS.TRACKER_DETAIL.NO_ENTRIES}</p>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => {
                const amountDollars = entry.amount / 100;
                const isInterest = entry.type === 'interest';
                const isPositive = entry.amount > 0;

                return (
                  <div key={entry.entryId} className={CSS_CLASSES.CARDS.TRANSACTION}>
                    <div className="flex items-center gap-3">
                      <div className={`p-1 rounded ${isInterest ? 'text-orange-500' : isPositive ? 'text-green-500' : 'text-red-500'}`}>
                        {isInterest ? <Percent size={16} /> : isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      </div>
                      <div>
                        <p className={CSS_CLASSES.TEXT.TRANSACTION_AMOUNT}>
                          {isPositive ? '+' : ''}{formatCurrency(amountDollars)}
                        </p>
                        {isInterest && entry.days && (
                          <p className={CSS_CLASSES.TEXT.SMALL_TEXT}>
                            Interest ({entry.days} days)
                          </p>
                        )}
                        {entry.note && (
                          <p className={CSS_CLASSES.TEXT.TRANSACTION_NOTE}>{entry.note}</p>
                        )}
                        <p className={CSS_CLASSES.TEXT.SMALL_TEXT}>
                          {formatDate(entry.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={CSS_CLASSES.TEXT.TRANSACTION_BALANCE}>
                        {formatCurrency(entry.runningTotal / 100)}
                      </p>
                      <p className={CSS_CLASSES.TEXT.SMALL_TEXT}>{LABELS.COMMON.BALANCE}</p>
                    </div>
                  </div>
                );
              })}

              {nextToken && (
                <div className="text-center pt-2">
                  <button
                    onClick={loadMoreEntries}
                    disabled={loadingMore}
                    className={buttonPresets.navButton(loadingMore)}
                  >
                    {loadingMore ? '...' : LABELS.TRACKER_DETAIL.LOAD_MORE}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Delete tracker (Story 7.7) */}
        <div className={CSS_CLASSES.CONTAINERS.CENTER}>
          {deleteError && (
            <p className="text-red-600 text-sm mb-2">{deleteError}</p>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={buttonPresets.actionDanger(deleting)}
          >
            {deleting ? LABELS.TRACKER_DETAIL.DELETING : LABELS.TRACKER_DETAIL.DELETE_TRACKER}
          </button>
        </div>
      </div>
    </div>
  );
}
