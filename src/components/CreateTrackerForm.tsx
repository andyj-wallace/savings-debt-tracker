/**
 * CreateTrackerForm Component
 *
 * Form for creating a new tracker via the API backend.
 * Accepts name, mode, goal amount, and optional interest rate.
 *
 * Story 7.4: Create Tracker API Integration
 *
 * @fileoverview API-backed tracker creation form
 */

import { useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { LABELS, MODES, CSS_CLASSES } from '../constants';
import { cardPresets } from '../styles/cardStyles';
import { inputPresets, inputLabel } from '../styles/inputStyles';
import { buttonPresets } from '../styles/buttonStyles';
import type { Mode } from '../types';

interface CreateTrackerFormProps {
  onCreated: (trackerId: string) => void;
  onCancel: () => void;
}

export default function CreateTrackerForm({ onCreated, onCancel }: CreateTrackerFormProps) {
  const [name, setName] = useState('');
  const [mode, setMode] = useState<Mode>('savings');
  const [goalAmount, setGoalAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Tracker name is required.');
      return;
    }

    const goalDollars = parseFloat(goalAmount);
    if (!goalAmount || isNaN(goalDollars) || goalDollars <= 0) {
      setError('Please enter a valid goal amount greater than zero.');
      return;
    }

    const goalCents = Math.round(goalDollars * 100);

    const payload: {
      name: string;
      mode: Mode;
      goalAmount: number;
      interestRate?: number;
    } = {
      name: trimmedName,
      mode,
      goalAmount: goalCents,
    };

    if (mode === MODES.DEBT && interestRate) {
      const rate = parseFloat(interestRate);
      if (!isNaN(rate) && rate >= 0) {
        payload.interestRate = rate;
      }
    }

    setSubmitting(true);
    const result = await apiClient.createTracker(payload);
    setSubmitting(false);

    if (result.success && result.data) {
      onCreated(result.data.trackerId);
    } else {
      setError(result.error || 'Failed to create tracker.');
    }
  };

  return (
    <div className={CSS_CLASSES.CONTAINERS.MAIN}>
      <div className={CSS_CLASSES.CONTAINERS.CONTENT}>
        <div className={CSS_CLASSES.CONTAINERS.HEADER}>
          <h1 className={CSS_CLASSES.TEXT.TITLE}>{LABELS.TRACKER_FORM.CREATE_TITLE}</h1>
        </div>

        <form onSubmit={handleSubmit} className={cardPresets.formCard()}>
          {/* Name */}
          <div className="mb-4">
            <label className={inputLabel.required}>{LABELS.TRACKER_FORM.NAME_LABEL}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={LABELS.TRACKER_FORM.NAME_PLACEHOLDER}
              className={`w-full ${inputPresets.formInput()}`}
              disabled={submitting}
            />
          </div>

          {/* Mode */}
          <div className="mb-4">
            <label className={inputLabel.base}>{LABELS.COMMON.TRACKING_MODE}</label>
            <div className="flex gap-4 mt-1">
              <button
                type="button"
                onClick={() => setMode('savings')}
                disabled={submitting}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                  mode === MODES.SAVINGS
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <TrendingUp size={18} /> {LABELS.TRACKER_LIST.SAVINGS}
              </button>
              <button
                type="button"
                onClick={() => setMode('debt')}
                disabled={submitting}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                  mode === MODES.DEBT
                    ? 'bg-red-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <TrendingDown size={18} /> {LABELS.TRACKER_LIST.DEBT}
              </button>
            </div>
          </div>

          {/* Goal Amount */}
          <div className="mb-4">
            <label className={inputLabel.required}>{LABELS.TRACKER_FORM.GOAL_LABEL}</label>
            <input
              type="number"
              value={goalAmount}
              onChange={(e) => setGoalAmount(e.target.value)}
              placeholder="0.00"
              min="0.01"
              step="0.01"
              className={`w-full ${inputPresets.currencyInput()}`}
              disabled={submitting}
            />
          </div>

          {/* Interest Rate (debt mode only) */}
          {mode === MODES.DEBT && (
            <div className="mb-4">
              <label className={inputLabel.optional}>{LABELS.TRACKER_FORM.INTEREST_LABEL}</label>
              <input
                type="number"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                placeholder="18.99"
                min="0"
                max="99.99"
                step="0.01"
                className={`w-full ${inputPresets.percentageInput()}`}
                disabled={submitting}
              />
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className={buttonPresets.formCancel()}
            >
              {LABELS.TRACKER_FORM.CANCEL}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`flex-1 ${buttonPresets.formSubmit(submitting)}`}
            >
              {submitting ? LABELS.TRACKER_FORM.CREATING : LABELS.TRACKER_FORM.CREATE_BUTTON}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
