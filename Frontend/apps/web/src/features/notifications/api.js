import { api } from '../../lib/apiClient.js';

/**
 * Notifications API (Section 5: components never call fetch — hooks go through
 * here). Shapes are recorded in docs/api-contract/contract-requests.md
 * (requests 17–19) and served by the labelled MSW fixtures in `mocks/` until
 * the real API lands. The one-tap approval action stays out until contract
 * request 8 defines its endpoint + undo semantics.
 */

/**
 * The signed-in person's notifications, newest first.
 * @returns {Promise<{rows: Array<{id: string, kind: string, key: string, params: object, createdAt: string, read: boolean, link: string|null}>}>}
 */
export async function fetchNotifications() {
  return (await api.get('/notifications')).data;
}

/**
 * Mark one notification read (§7.10: unread → read). Never optimistic — the
 * server's row is the truth, and the panel refetches once it answers.
 * @param {string} id
 */
export async function markNotificationRead(id) {
  return (await api.post(`/notifications/${encodeURIComponent(id)}/read`)).data;
}

/** Mark every notification read in one call. */
export async function markAllNotificationsRead() {
  return (await api.post('/notifications/read-all')).data;
}
