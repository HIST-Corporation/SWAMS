import { api } from '../../lib/apiClient.js';

/**
 * Reports API (Section 5: components never call fetch — hooks go through here).
 * Shapes are recorded in docs/api-contract/contract-requests.md (request 21)
 * and served by the labelled MSW fixtures in `mocks/` until the real API lands.
 * The CSV is generated server-side from the same rows, so the export can never
 * disagree with the table on screen.
 */

/**
 * One report for a period.
 * @param {{ type: 'attendance'|'leave'|'tasks', from: string, to: string }} params
 * @returns {Promise<{type: string, from: string, to: string, rows: object[], summary: object}>}
 */
export async function fetchReport({ type, from, to }) {
  return (await api.get('/reports', { params: { type, from, to } })).data;
}

/**
 * The same report as CSV (text/csv).
 * @param {{ type: 'attendance'|'leave'|'tasks', from: string, to: string }} params
 * @returns {Promise<Blob>}
 */
export async function fetchReportCsv({ type, from, to }) {
  const response = await api.get('/reports.csv', {
    params: { type, from, to },
    responseType: 'blob',
  });
  return response.data;
}

/**
 * Period analytics for the /analytics screen: one series + one breakdown +
 * one summary per period, so no two panels can disagree (§7.6).
 * @param {{ period: 'week'|'month'|'year' }} params
 * @returns {Promise<{period: string, points: object[], summary: object, breakdown: object}>}
 */
export async function fetchAnalytics({ period }) {
  return (await api.get('/reports/analytics', { params: { period } })).data;
}
