// PUBLIC API — the only file other features may import (Section 6.2 rule 1).
//
// Only what another feature actually renders lives here (the dashboard
// HomePage uses PunchCard, the week panel reads history, and "Needs you"
// reads corrections). This feature's own pages are reached by the router via
// `routes/index.jsx`, and its internals import their concrete modules directly —
// re-exporting them here would create entry points nothing imports.
//
// `useTeamAttendance` left this list on 2026-10-12: the reviewer Home's
// workforce panel now reads the org board, so the team hook's only remaining
// consumer is this feature's own /attendance/team page, which imports it directly.
export { PunchCard } from './components/PunchCard.jsx';
export { useAttendanceHistory, useCorrections, useAttendanceToday } from './hooks/useAttendance.js';
