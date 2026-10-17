import { http } from 'msw';
import { authHandlers } from '../features/auth/mocks/handlers.js';
import { attendanceHandlers } from '../features/attendance/mocks/handlers.js';
import { dashboardHandlers } from '../features/dashboard/mocks/handlers.js';
import { leaveHandlers } from '../features/leave/mocks/handlers.js';
import { notificationHandlers } from '../features/notifications/mocks/handlers.js';
import { auditHandlers } from '../features/audit/mocks/handlers.js';
import { reportHandlers } from '../features/reports/mocks/handlers.js';
import { taskHandlers } from '../features/tasks/mocks/handlers.js';
import { calendarHandlers } from '../features/calendar/mocks/handlers.js';

const API = `${import.meta.env.VITE_API_URL ?? ''}/api/v1`;

/**
 * Contract handlers for the app skeleton (Section 5, mock-first).
 * Feature handlers live in each feature's `mocks/` folder and are aggregated
 * here as features land.
 */
export const handlers = [
  ...authHandlers,
  ...attendanceHandlers,
  ...dashboardHandlers,
  ...leaveHandlers,
  ...notificationHandlers,
  ...auditHandlers,
  ...reportHandlers,
  ...taskHandlers,
  ...calendarHandlers,

  http.get(`${API}/health`, () => Response.json({ status: 'ok', mock: true })),
];
