/** Query-key factory for the dashboard feature (Section 10, Data). */
export const dashboardKeys = {
  summary: ['dashboard', 'summary'],
  tasksToday: () => ['dashboard', 'tasks', 'today'],
  leaveBalance: () => ['dashboard', 'leave', 'balance'],
  presence: () => ['dashboard', 'presence'],
  orgOverview: () => ['dashboard', 'org', 'overview'],
  orgDashboard: () => ['dashboard', 'org', 'dashboard'],
  upcoming: () => ['dashboard', 'events', 'upcoming'],
  /** The signed-in persona's board (request 26) — one cache entry per role. */
  staffBoard: (role) => ['dashboard', 'staff', 'board', role ?? 'unknown'],
};
