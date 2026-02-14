/**
 * MigrationBanner Component
 *
 * Story 9.1: One-Time LocalStorage Migration
 * Shows a banner when localStorage data exists and API mode is active,
 * allowing the user to migrate their data to the cloud backend.
 *
 * @fileoverview Migration prompt and progress UI
 */

import { useState } from 'react';
import { hasLocalStorageData, migrateToApi, clearLocalStorageData } from '../services/migrationService';
import type { MigrationResult } from '../services/migrationService';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { CSS_CLASSES, LABELS } from '../constants';

type BannerState = 'prompt' | 'migrating' | 'success' | 'error' | 'confirm-clear' | 'hidden';

export default function MigrationBanner({ onMigrationComplete }: { onMigrationComplete?: () => void }) {
  const isOnline = useOnlineStatus();
  const [state, setState] = useState<BannerState>(
    hasLocalStorageData() ? 'prompt' : 'hidden'
  );
  const [result, setResult] = useState<MigrationResult | null>(null);

  if (state === 'hidden') return null;

  const handleMigrate = async () => {
    setState('migrating');
    const migrationResult = await migrateToApi();
    setResult(migrationResult);

    if (migrationResult.success) {
      setState('confirm-clear');
    } else if (migrationResult.trackerCreated) {
      // Partial success — tracker created but some entries failed
      setState('confirm-clear');
    } else {
      setState('error');
    }
  };

  const handleClearAndDismiss = () => {
    clearLocalStorageData();
    setState('hidden');
    onMigrationComplete?.();
  };

  const handleKeepAndDismiss = () => {
    setState('hidden');
    onMigrationComplete?.();
  };

  return (
    <div className={CSS_CLASSES.CONTAINERS.CONTENT}>
      <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
        {state === 'prompt' && (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-blue-900">
                {LABELS.MIGRATION.PROMPT_TITLE}
              </p>
              <p className="text-sm text-blue-700">
                {LABELS.MIGRATION.PROMPT_DESCRIPTION}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setState('hidden')}
                className="px-3 py-1.5 text-sm text-blue-700 hover:text-blue-900"
              >
                {LABELS.MIGRATION.DISMISS}
              </button>
              <button
                onClick={handleMigrate}
                disabled={!isOnline}
                title={!isOnline ? LABELS.OFFLINE.ACTION_DISABLED : undefined}
                className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
              >
                {LABELS.MIGRATION.MIGRATE_BUTTON}
              </button>
            </div>
          </div>
        )}

        {state === 'migrating' && (
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
            <p className="text-blue-900">{LABELS.MIGRATION.IN_PROGRESS}</p>
          </div>
        )}

        {state === 'confirm-clear' && result && (
          <div>
            <p className="font-medium text-green-900 mb-1">
              {LABELS.MIGRATION.SUCCESS_TITLE}
            </p>
            <p className="text-sm text-green-700 mb-3">
              {result.entriesMigrated} {result.entriesMigrated === 1 ? 'entry' : 'entries'} migrated.
              {result.entriesFailed > 0 && ` ${result.entriesFailed} failed.`}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleClearAndDismiss}
                className="px-4 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg"
              >
                {LABELS.MIGRATION.CLEAR_LOCAL}
              </button>
              <button
                onClick={handleKeepAndDismiss}
                className="px-3 py-1.5 text-sm text-green-700 hover:text-green-900"
              >
                {LABELS.MIGRATION.KEEP_LOCAL}
              </button>
            </div>
          </div>
        )}

        {state === 'error' && result && (
          <div>
            <p className="font-medium text-red-900 mb-1">
              {LABELS.MIGRATION.ERROR_TITLE}
            </p>
            <p className="text-sm text-red-700 mb-3">
              {result.errors[0] || 'An unknown error occurred.'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleMigrate}
                className="px-4 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg"
              >
                {LABELS.MIGRATION.RETRY}
              </button>
              <button
                onClick={() => setState('hidden')}
                className="px-3 py-1.5 text-sm text-red-700 hover:text-red-900"
              >
                {LABELS.MIGRATION.DISMISS}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
