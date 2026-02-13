/**
 * useDataSource Hook
 *
 * Provides the current data source based on the useApiBackend feature flag.
 * Components and hooks use this to decide whether to read/write from
 * localStorage or the API backend.
 *
 * Toggle without code changes by setting REACT_APP_USE_API_BACKEND=true
 *
 * Story 7.2: Feature Flag for Backend Toggle
 *
 * @fileoverview Data source selector hook
 */

import { useMemo } from 'react';
import { config } from '../config/app.config';

export type DataSource = 'localStorage' | 'api';

/**
 * Returns the active data source based on the useApiBackend feature flag.
 */
export function useDataSource(): DataSource {
  return useMemo(
    () => (config.isFeatureEnabled('useApiBackend') ? 'api' : 'localStorage'),
    []
  );
}
