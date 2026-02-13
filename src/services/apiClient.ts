/**
 * API Client Service
 *
 * Centralized HTTP client for communicating with the debt-tracker Lambda API.
 * Automatically attaches JWT tokens from react-oidc-context and provides
 * consistent error handling matching the ServiceResult pattern.
 *
 * Story 7.1: API Client Service
 *
 * @fileoverview API client singleton for frontend-to-backend communication
 */

import { appConfig } from '../config/app.config';
import type {
  ServiceResult,
  ApiTracker,
  ApiTrackerDetail,
  ApiEntry,
  PaginatedResponse,
  CreateTrackerRequest,
  UpdateTrackerRequest,
  CreateEntryRequest,
} from '../types';

/**
 * Shape of the Lambda error response body
 */
interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    correlationId?: string;
  };
}

class ApiClient {
  private baseUrl: string;
  private getAccessToken: (() => string | undefined) | null = null;

  constructor() {
    this.baseUrl = appConfig.api?.baseUrl || '';
  }

  /**
   * Wire in the token getter from react-oidc-context.
   * Call once at app startup after AuthProvider mounts.
   */
  configure(getAccessToken: () => string | undefined): void {
    this.getAccessToken = getAccessToken;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.getAccessToken) {
      const token = this.getAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<ServiceResult<T>> {
    try {
      const url = `${this.baseUrl}${path}`;
      const options: RequestInit = {
        method,
        headers: this.getHeaders(),
      };

      if (body !== undefined) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);

      // 204 No Content (e.g. delete)
      if (response.status === 204) {
        return { success: true, data: undefined as T };
      }

      // Parse JSON response
      let json: unknown;
      try {
        json = await response.json();
      } catch {
        return {
          success: false,
          error: `Unexpected response from server (${response.status})`,
        };
      }

      // Success responses
      if (response.ok) {
        const successBody = json as { success: true; data: T; message?: string };
        return {
          success: true,
          data: successBody.data,
          metadata: successBody.message ? { message: successBody.message } : undefined,
        };
      }

      // Error responses
      const errorBody = json as ApiErrorBody;
      if (errorBody?.error?.message) {
        return {
          success: false,
          error: errorBody.error.message,
          metadata: {
            code: errorBody.error.code,
            statusCode: response.status,
            ...(errorBody.error.correlationId && { correlationId: errorBody.error.correlationId }),
          },
        };
      }

      return {
        success: false,
        error: `Request failed with status ${response.status}`,
      };
    } catch (err) {
      // Network errors, CORS failures, etc.
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        return {
          success: false,
          error: 'Unable to reach the server. Please check your connection.',
        };
      }

      return {
        success: false,
        error: err instanceof Error ? err.message : 'An unexpected error occurred',
      };
    }
  }

  // ── Tracker endpoints ──

  async listTrackers(
    limit?: number,
    nextToken?: string
  ): Promise<ServiceResult<PaginatedResponse<ApiTracker>>> {
    const params = new URLSearchParams();
    if (limit) params.set('limit', String(limit));
    if (nextToken) params.set('nextToken', nextToken);
    const query = params.toString();
    return this.request('GET', `/trackers${query ? `?${query}` : ''}`);
  }

  async createTracker(
    input: CreateTrackerRequest
  ): Promise<ServiceResult<ApiTracker>> {
    return this.request('POST', '/trackers', input);
  }

  async getTracker(id: string): Promise<ServiceResult<ApiTrackerDetail>> {
    return this.request('GET', `/trackers/${encodeURIComponent(id)}`);
  }

  async updateTracker(
    id: string,
    input: UpdateTrackerRequest
  ): Promise<ServiceResult<ApiTracker>> {
    return this.request('PUT', `/trackers/${encodeURIComponent(id)}`, input);
  }

  async deleteTracker(id: string): Promise<ServiceResult<void>> {
    return this.request('DELETE', `/trackers/${encodeURIComponent(id)}`);
  }

  // ── Entry endpoints ──

  async listEntries(
    trackerId: string,
    limit?: number,
    nextToken?: string
  ): Promise<ServiceResult<PaginatedResponse<ApiEntry>>> {
    const params = new URLSearchParams();
    if (limit) params.set('limit', String(limit));
    if (nextToken) params.set('nextToken', nextToken);
    const query = params.toString();
    return this.request(
      'GET',
      `/trackers/${encodeURIComponent(trackerId)}/entries${query ? `?${query}` : ''}`
    );
  }

  async createEntry(
    trackerId: string,
    input: CreateEntryRequest
  ): Promise<ServiceResult<ApiEntry>> {
    return this.request(
      'POST',
      `/trackers/${encodeURIComponent(trackerId)}/entries`,
      input
    );
  }
}

/**
 * Singleton API client instance.
 * Call apiClient.configure() with a token getter before making requests.
 */
export const apiClient = new ApiClient();
