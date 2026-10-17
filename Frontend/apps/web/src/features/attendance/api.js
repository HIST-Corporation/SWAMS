import { api } from '../../lib/apiClient.js';

/**
 * Attendance API (Section 5: components never call fetch — hooks go through
 * here, and this goes through the shared api-client). Shapes follow the OpenAPI
 * contract; anything the contract lacks is listed in
 * docs/api-contract/contract-requests.md, never invented silently.
 */

/** @returns {Promise<{session: object|null, site: object|null, schedule: object|null}>} */
export async function fetchAttendanceToday() {
  return (await api.get('/attendance/today')).data;
}

/** @returns {Promise<{requiresLocation: boolean, allowOverride: boolean, sites: object[]}>} */
export async function fetchAttendancePolicy() {
  return (await api.get('/attendance/policy')).data;
}

/**
 * @param {{ from?: string, to?: string, page?: number, perPage?: number }} [params]
 * @returns {Promise<{rows: object[], page: number, hasMore: boolean}>}
 */
export async function fetchAttendanceHistory(params = {}) {
  return (await api.get('/attendance/history', { params })).data;
}

/**
 * Clock in or out. `idempotencyKey` makes an offline retry safe: the server
 * dedupes by key, so a queued punch can never post twice (§7.1/7.2).
 * @param {{ kind: 'in'|'out', idempotencyKey: string, clientTs: string, location?: object }} input
 */
export async function postPunch({ kind, idempotencyKey, clientTs, location }) {
  return (await api.post('/attendance/punch', { kind, idempotencyKey, clientTs, location })).data;
}

/** Today's board for a manager or HR: who is in, who is late, what needs review. */
export async function fetchTeamAttendance({ date } = {}) {
  return (await api.get('/attendance/team', { params: { date } })).data;
}

/**
 * Every day of one calendar month with its status, for the month calendar.
 * @param {{ month: string }} params `YYYY-MM`
 * @returns {Promise<{month: string, days: object[]}>}
 */
export async function fetchAttendanceCalendar({ month }) {
  return (await api.get('/attendance/calendar', { params: { month } })).data;
}

/**
 * The requester's correction records (§7.5). `status` filters the queue the
 * manager sees (`pending`) from the requests a person made (`mine`).
 * @param {{ status?: 'mine'|'pending'|'all', page?: number, perPage?: number }} [params]
 */
export async function fetchCorrections(params = {}) {
  return (await api.get('/attendance/corrections', { params })).data;
}

/**
 * Ask for a punch to be corrected. The server owns the lifecycle, so the UI
 * mirrors `status` from the response rather than assuming success.
 * @param {{ original: object|null, proposed: {clockIn?: string, clockOut?: string}, reason: string }} input
 */
export async function submitCorrection({ original, proposed, reason }) {
  return (await api.post('/attendance/corrections', { original, proposed, reason })).data;
}

/**
 * Approve, reject, or send a correction back with a question.
 * @param {{ id: string, decision: 'approve'|'reject'|'request_info', note?: string }} input
 */
export async function decideCorrection({ id, decision, note }) {
  return (await api.post(`/attendance/corrections/${id}/decision`, { decision, note })).data;
}
