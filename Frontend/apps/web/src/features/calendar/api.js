import { api } from '../../lib/apiClient.js';

/**
 * Calendar API (Section 5: components never call fetch — hooks go through here).
 * The shape is recorded in docs/api-contract/contract-requests.md (request 23)
 * and served by the labelled MSW fixtures in `mocks/` until the real API lands.
 * Events arrive pre-grouped by day; empty days are presentation, never data.
 */

/**
 * Every day in the range that has at least one event, sorted ascending.
 * @param {{ from: string, to: string }} params `YYYY-MM-DD` bounds
 * @returns {Promise<{from: string, to: string, days: Array<{date: string, events: Array<{kind: string, title: string}>}>}>}
 */
export async function fetchCalendar({ from, to }) {
  return (await api.get('/calendar', { params: { from, to } })).data;
}
