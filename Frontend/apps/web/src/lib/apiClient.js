import { createApiClient } from '@swams/api-client';
import { emitSessionEnded, getAccessToken } from './authStore.js';
import { refreshSession } from './authApi.js';

/**
 * The app's apiClient instance (Section 5): components never call fetch —
 * hooks go through here. Access token lives in memory (authStore); refresh
 * rides the httpOnly cookie with ONE in-flight refresh shared by queued
 * 401s; a failed refresh emits sessionEnded → session machine.
 */
export const api = createApiClient({
  baseURL: `${import.meta.env.VITE_API_URL ?? ''}/api/v1`,
  getAccessToken,
  refreshSession,
  onSessionEnded: emitSessionEnded,
});
