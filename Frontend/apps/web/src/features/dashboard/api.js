import { api } from '../../lib/apiClient.js';

/**
 * Dashboard API (Section 5: components never call fetch — hooks go through here).
 *
 * These three endpoints are the staff-home widgets in the screen inventory
 * (`GET /tasks?due=today`, `GET /leave/balance`, `GET /presence`). They are not
 * in the backend contract yet — shapes are recorded as rows 11 (tasks, served
 * by the tasks feature's store) and 12–15 in
 * docs/api-contract/contract-requests.md and served by labelled MSW fixtures
 * until the real API lands. Nothing here invents a response the contract lacks.
 *
 * NOTE: task rows themselves come from the tasks feature's store since slice 8
 * — `fetchTodayTasks` reads the compact `?due=today` view of the board's store,
 * so the due-date strings it receives are calendar dates (`YYYY-MM-DD`).

/** @returns {Promise<{rows: Array<{id: string, title: string, due: string|null, status: string}>}>} */
export async function fetchTodayTasks() {
  return (await api.get('/tasks', { params: { due: 'today' } })).data;
}

/** @returns {Promise<{rows: Array<{type: string, entitled: number, used: number, pending: number, remaining: number}>}>} */
export async function fetchLeaveBalance() {
  return (await api.get('/leave/balance')).data;
}

/** @returns {Promise<{rows: Array<{id: string, name: string, initials: string, presence: string}>}>} */
export async function fetchPresence() {
  return (await api.get('/presence')).data;
}

/** Org-wide counters behind the Home hero (contract request 14). */
/** @returns {Promise<{headcount: number, onSite: number, pending: number}>} */
export async function fetchOrgOverview() {
  return (await api.get('/org/overview')).data;
}

/** Meetings, leave and holidays ahead — the Home "Coming up" rail (request 15). */
/** @returns {Promise<{rows: Array<{id: string, kind: string, title: string, when: string|null, date: string|null}>}>} */
export async function fetchUpcoming() {
  return (await api.get('/events/upcoming')).data;
}

/**
 * The whole-company board behind the reviewer's Home (contract request 25).
 *
 * One payload owns the KPI row, the workforce donut, the attendance trend, the
 * department rates, the industry benchmark, the insights and today's meetings
 * — so no two sections of the same screen can state different numbers. The
 * insights arrive as i18n keys with the server's figures as params, the same
 * shape notifications already use (request 17).
 *
 * @returns {Promise<{asOf: string, kpi: object, presence: object, trend: object, departments: Array<object>, benchmarks: Array<object>, insights: Array<object>, meetings: Array<object>}>}
 */
export async function fetchOrgDashboard() {
  return (await api.get('/org/dashboard')).data;
}

/**
 * The signed-in staff persona's own work board (contract request 26).
 *
 * There is deliberately no `role` parameter: the mock (and the real endpoint)
 * picks the board from the session, so one demo account can never ask for
 * another persona's queue.
 *
 * @returns {Promise<{asOf: string, counts: {open: number, review: number, blocked: number, done: number}, queue: Array<object>, pod: Array<{id: string, name: string, initials: string, presence: string}>}>}
 */
export async function fetchStaffBoard() {
  return (await api.get('/staff/board')).data;
}
