/**
 * TrackerList Component
 *
 * Fetches and displays the user's trackers from the API backend.
 * Handles loading, error, and empty states.
 *
 * Story 7.3: Tracker List API Integration
 *
 * @fileoverview Tracker list view for API-backed mode
 */

import { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { formatCurrency } from '../utils/formatCurrency';
import { LABELS, CSS_CLASSES, MODES } from '../constants';
import { buttonPresets } from '../styles/buttonStyles';
import type { ApiTracker } from '../types';

interface TrackerListProps {
  onSelectTracker?: (trackerId: string) => void;
  onCreateTracker?: () => void;
}

export default function TrackerList({ onSelectTracker, onCreateTracker }: TrackerListProps) {
  const [trackers, setTrackers] = useState<ApiTracker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrackers = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await apiClient.listTrackers();

    if (result.success && result.data) {
      setTrackers(result.data.items);
    } else {
      setError(result.error || LABELS.TRACKER_LIST.ERROR);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTrackers();
  }, [fetchTrackers]);

  if (loading) {
    return (
      <div className={CSS_CLASSES.CONTAINERS.MAIN}>
        <div className={CSS_CLASSES.CONTAINERS.CONTENT}>
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
              <p className="text-slate-600">Loading trackers...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={CSS_CLASSES.CONTAINERS.MAIN}>
        <div className={CSS_CLASSES.CONTAINERS.CONTENT}>
          <div className="text-center py-20">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchTrackers}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
            >
              {LABELS.TRACKER_LIST.RETRY}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={CSS_CLASSES.CONTAINERS.MAIN}>
      <div className={CSS_CLASSES.CONTAINERS.CONTENT}>
        <div className="flex items-center justify-between mb-8">
          <h1 className={CSS_CLASSES.TEXT.TITLE}>{LABELS.TRACKER_LIST.TITLE}</h1>
          {onCreateTracker && (
            <button
              onClick={onCreateTracker}
              className={`flex items-center gap-2 ${buttonPresets.formSubmit()}`}
            >
              <Plus size={18} /> {LABELS.TRACKER_LIST.CREATE}
            </button>
          )}
        </div>

        {trackers.length === 0 ? (
          <div className={CSS_CLASSES.CARDS.PRIMARY}>
            <p className="text-center text-slate-500 py-8">
              {LABELS.TRACKER_LIST.EMPTY}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {trackers.map((tracker) => {
              const currentDollars = tracker.currentAmount / 100;
              const goalDollars = tracker.goalAmount / 100;
              const isDebt = tracker.mode === MODES.DEBT;

              return (
                <button
                  key={tracker.trackerId}
                  onClick={() => onSelectTracker?.(tracker.trackerId)}
                  className={`${CSS_CLASSES.CARDS.PRIMARY} w-full text-left hover:shadow-lg transition-shadow cursor-pointer`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-slate-800">
                      {tracker.name}
                    </h2>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        isDebt
                          ? 'bg-red-100 text-red-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {isDebt ? LABELS.TRACKER_LIST.DEBT : LABELS.TRACKER_LIST.SAVINGS}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
                    <span>
                      {formatCurrency(currentDollars)} / {formatCurrency(goalDollars)}
                    </span>
                    <span>{Math.round(tracker.percentage)}%</span>
                  </div>

                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        isDebt ? 'bg-red-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(100, tracker.percentage)}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
