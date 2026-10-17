import { Skeleton } from '@swams/ui';
import { AppShell } from '../shell/AppShell.jsx';
import { RouteError } from '../app/error-boundary/RouteError.jsx';
import { RequireAuth } from '../app/RequireAuth.jsx';
import { RequirePermission } from '../app/RequirePermission.jsx';
import { RootRedirect } from '../app/RootRedirect.jsx';
import { NAV_ITEMS } from '../app/nav.config.js';

/**
 * Shown while the initial lazy chunk hydrates (Section 8.11: skeletons, not
 * spinners). Without it React Router renders nothing on first paint.
 */
function HydrateFallback() {
  return (
    <div className="mx-auto grid max-w-reading gap-6" role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-8 w-64" />
      <Skeleton block className="h-40 rounded-card" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton block className="h-32 rounded-card" />
        <Skeleton block className="h-32 rounded-card" />
      </div>
    </div>
  );
}

const item = (id) => NAV_ITEMS.find((navItem) => navItem.id === id);
const dashboardItem = item('dashboard');
const attendanceItem = item('attendance');
const leaveItem = item('leave');
const settingsItem = item('settings');
const auditItem = item('audit');
const reportsItem = item('reports');
const analyticsItem = item('analytics');
const tasksItem = item('tasks');
const calendarItem = item('calendar');

/** Org setup is an admin action (screen inventory: settings.manage, R2). */
const setupItem = { id: 'org-setup', enabled: true, requires: { permission: 'settings.manage' } };

/** The team attendance board is a manager/HR lens (slice 4): reviewers only. */
const teamBoardItem = {
  id: 'team-board',
  enabled: true,
  requires: { permission: 'attendance.approve', entitlement: 'attendance' },
};

/**
 * Route tree (Section 6): only route objects here — pages are lazy imports,
 * guards come from app/. Auth routes stand outside AppShell (no chrome);
 * everything else is behind RequireAuth (Section 7.3).
 */
export const routes = [
  {
    path: '/login',
    errorElement: <RouteError />,
    HydrateFallback,
    lazy: async () => {
      const { LoginPage } = await import('../features/auth/pages/LoginPage.jsx');
      return { Component: LoginPage };
    },
  },
  // Dedicated demo sign-in URL (Section 13 parity row): the landing's "Try live
  // demo" actions open the sign-in page at its own path so a first-time visitor
  // lands on a demo-flavoured entry rather than the generic /login. Same screen,
  // separate URL — the session machine takes over from here (§7.3).
  {
    path: '/demo',
    errorElement: <RouteError />,
    HydrateFallback,
    lazy: async () => {
      const { LoginPage } = await import('../features/auth/pages/LoginPage.jsx');
      return { Component: LoginPage };
    },
  },
  // Public marketing landing (Section 13 parity row): first visit lands here,
  // authenticated visits go straight to the dashboard.
  {
    path: '/landing',
    errorElement: <RouteError />,
    HydrateFallback,
    lazy: async () => {
      const { LandingPage } = await import('../features/marketing/pages/LandingPage.jsx');
      return { Component: LandingPage };
    },
  },
  // The root is the gate: landing for guests, dashboard for sessions.
  {
    path: '/',
    element: <RootRedirect />,
  },
  {
    path: '/setup',
    errorElement: <RouteError />,
    lazy: async () => {
      const { OrgSetupWizard } = await import('../features/onboarding/pages/OrgSetupWizard.jsx');
      return {
        Component: () => (
          <RequireAuth>
            <RequirePermission item={setupItem}>
              <OrgSetupWizard />
            </RequirePermission>
          </RequireAuth>
        ),
      };
    },
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    errorElement: <RouteError />,
    HydrateFallback,
    children: [
      {
        path: 'dashboard',
        lazy: async () => {
          const { HomePage } = await import('../features/dashboard/pages/HomePage.jsx');
          return {
            Component: () => (
              <RequirePermission item={dashboardItem}>
                <HomePage />
              </RequirePermission>
            ),
          };
        },
      },
      {
        path: 'attendance',
        lazy: async () => {
          const { TodayPage } = await import('../features/attendance/pages/TodayPage.jsx');
          return {
            Component: () => (
              <RequirePermission item={attendanceItem}>
                <TodayPage />
              </RequirePermission>
            ),
          };
        },
      },
      {
        path: 'attendance/history',
        lazy: async () => {
          const { HistoryPage } = await import('../features/attendance/pages/HistoryPage.jsx');
          return {
            Component: () => (
              <RequirePermission item={attendanceItem}>
                <HistoryPage />
              </RequirePermission>
            ),
          };
        },
      },
      {
        path: 'attendance/team',
        lazy: async () => {
          const { TeamBoardPage } = await import('../features/attendance/pages/TeamBoardPage.jsx');
          return {
            Component: () => (
              <RequirePermission item={teamBoardItem}>
                <TeamBoardPage />
              </RequirePermission>
            ),
          };
        },
      },
      {
        path: 'attendance/corrections',
        lazy: async () => {
          const { CorrectionsPage } =
            await import('../features/attendance/pages/CorrectionsPage.jsx');
          return {
            Component: () => (
              <RequirePermission item={attendanceItem}>
                <CorrectionsPage />
              </RequirePermission>
            ),
          };
        },
      },
      {
        path: 'leave',
        lazy: async () => {
          const { LeavePage } = await import('../features/leave/pages/LeavePage.jsx');
          return {
            Component: () => (
              <RequirePermission item={leaveItem}>
                <LeavePage />
              </RequirePermission>
            ),
          };
        },
      },
      {
        path: 'settings',
        lazy: async () => {
          const { SettingsPage } = await import('../features/settings/pages/SettingsPage.jsx');
          return {
            Component: () => (
              <RequirePermission item={settingsItem}>
                <SettingsPage />
              </RequirePermission>
            ),
          };
        },
      },
      {
        path: 'audit',
        lazy: async () => {
          const { AuditPage } = await import('../features/audit/pages/AuditPage.jsx');
          return {
            Component: () => (
              <RequirePermission item={auditItem}>
                <AuditPage />
              </RequirePermission>
            ),
          };
        },
      },
      {
        path: 'reports',
        lazy: async () => {
          const { ReportsPage } = await import('../features/reports/pages/ReportsPage.jsx');
          return {
            Component: () => (
              <RequirePermission item={reportsItem}>
                <ReportsPage />
              </RequirePermission>
            ),
          };
        },
      },
      {
        path: 'analytics',
        lazy: async () => {
          const { AnalyticsPage } = await import('../features/reports/pages/AnalyticsPage.jsx');
          return {
            Component: () => (
              <RequirePermission item={analyticsItem}>
                <AnalyticsPage />
              </RequirePermission>
            ),
          };
        },
      },
      {
        path: 'work/tasks',
        lazy: async () => {
          const { TasksPage } = await import('../features/tasks/pages/TasksPage.jsx');
          return {
            Component: () => (
              <RequirePermission item={tasksItem}>
                <TasksPage />
              </RequirePermission>
            ),
          };
        },
      },
      {
        path: 'calendar',
        lazy: async () => {
          const { CalendarPage } = await import('../features/calendar/pages/CalendarPage.jsx');
          return {
            Component: () => (
              <RequirePermission item={calendarItem}>
                <CalendarPage />
              </RequirePermission>
            ),
          };
        },
      },
      {
        path: 'messages',
        lazy: async () => {
          const { MessagesPage } = await import('../features/messages/pages/MessagesPage.jsx');
          return { Component: MessagesPage };
        },
      },
      {
        path: 'meetings',
        lazy: async () => {
          const { MeetingsPage } = await import('../features/meetings/pages/MeetingsPage.jsx');
          return { Component: MeetingsPage };
        },
      },
      {
        path: 'video',
        lazy: async () => {
          const { VideoCallPage } = await import('../features/video/pages/VideoCallPage.jsx');
          return { Component: VideoCallPage };
        },
      },
      {
        path: 'meetup',
        lazy: async () => {
          const { TeamMeetupPage } = await import('../features/team/pages/TeamMeetupPage.jsx');
          return { Component: TeamMeetupPage };
        },
      },
      {
        path: 'team',
        lazy: async () => {
          const { TeamPage } = await import('../features/team/pages/TeamPage.jsx');
          return { Component: TeamPage };
        },
      },
      {
        path: 'more',
        lazy: async () => {
          const { MorePage } = await import('../shell/pages/MorePage.jsx');
          return { Component: MorePage };
        },
      },
      {
        path: 'no-access',
        lazy: async () => {
          const { NoAccessPage } = await import('../shell/pages/NoAccessPage.jsx');
          return { Component: NoAccessPage };
        },
      },
      {
        path: '*',
        lazy: async () => {
          const { NotFoundPage } = await import('../shell/pages/NotFoundPage.jsx');
          return { Component: NotFoundPage };
        },
      },
    ],
  },
];
