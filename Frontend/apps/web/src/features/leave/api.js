import { api } from '../../lib/apiClient.js';

/**
 * Leave API (Section 5: components never call fetch — hooks go through here).
 * Shapes follow the screen-inventory row for `/leave`; anything the contract
 * lacks is listed in docs/api-contract/contract-requests.md, never invented.
 */

/**
 * The signed-in person's balance. The server computes entitlements — the UI
 * never derives them (§7.6).
 * @returns {Promise<{rows: Array<{type: string, entitled: number, used: number, pending: number, remaining: number}>}>}
 */
export async function fetchLeaveBalance() {
  return (await api.get('/leave/balance')).data;
}

/**
 * Leave requests. `status` separates what a person asked for (`mine`) from the
 * reviewer bench (`pending`), mirroring the corrections filter.
 * @param {{ status?: 'mine'|'pending'|'all', page?: number, perPage?: number }} [params]
 * @returns {Promise<{rows: object[], page?: number, hasMore?: boolean}>}
 */
export async function fetchLeaveRequests(params = {}) {
  return (await api.get('/leave/requests', { params })).data;
}

/**
 * Ask for leave. The server owns the lifecycle, so the caller mirrors the
 * returned `status` rather than assuming success (§12.1).
 * @param {{ type: 'annual'|'sick'|'unpaid'|'special', start: string, end: string, note?: string }} input
 */
export async function submitLeaveRequest(input) {
  return (await api.post('/leave/requests', input)).data;
}

/**
 * Approve or reject a request (reviewers only). Never optimistic: the row's
 * status is the server's to state.
 * @param {{ id: string, decision: 'approve'|'reject', note?: string }} input
 */
export async function decideLeaveRequest({ id, decision, note }) {
  return (await api.post(`/leave/requests/${id}/decision`, { decision, note })).data;
}

/** Public holidays for the org — shown beside the form so dates are chosen with context. */
export async function fetchLeaveHolidays() {
  return (await api.get('/leave/holidays')).data;
}
