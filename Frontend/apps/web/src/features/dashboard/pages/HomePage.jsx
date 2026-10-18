import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Download, Fingerprint } from 'lucide-react';
import { Button, Card, CardTitle, ErrorState, PageHeader, PreviewNotice, Skeleton } from '@swams/ui';
import { formatDateAd, nepalParts } from '@swams/i18n';
import { PunchCard } from '../../attendance/index.js';
import { useSession } from '../../../hooks/useSession.js';
import { triggerBlobDownload } from '../../../lib/download.js';
import { dashboardView } from '../utils/scope.js';
import { BenchmarkTable } from '../components/BenchmarkTable.jsx';
import { DepartmentBars } from '../components/DepartmentBars.jsx';
import { KpiRow } from '../components/KpiRow.jsx';
import { NeedsYou } from '../components/NeedsYou.jsx';
import { OrgInsights } from '../components/OrgInsights.jsx';
import { OrgTrendChart } from '../components/OrgTrendChart.jsx';
import { SessionBand } from '../components/SessionBand.jsx';
import { StaffBoard } from '../components/StaffBoard.jsx';
import { TeamNow } from '../components/TeamNow.jsx';
import { TodayMeetings } from '../components/TodayMeetings.jsx';
import { TodayTasks } from '../components/TodayTasks.jsx';
import { UpcomingEvents } from '../components/UpcomingEvents.jsx';
import { WeekChart } from '../components/WeekChart.jsx';
import { WorkforcePanel } from '../components/WorkforcePanel.jsx';
import {
  useHrDashboard,
  useManagerDashboard,
  useOrgDashboard,
  useOwnerDashboard,
  useTeamLeadDashboard,
} from '../hooks/useDashboard.js';
import { buildOrgSnapshotCsv } from '../utils/orgSnapshot.js';

/**
 * Home — role-specific dashboard panels per role (owner, hr, manager, team-lead, team, staff).
 * `#page-dashboard`), with two variants:
 *
 *   reviewer (manager / HR)   the prototype's composed board:
 *                             `.page-header` (Export + Clock in/out)
 *                             `.dash-composed` `1fr 300px` — the `.grid-4` KPI
 *                             row over the trend + department charts on the
 *                             left, the tall `.panel-lavender` workforce
 *                             panel spanning on the right (it collapses under
 *                             1100px, as the prototype does)
 *                             `.grid-2` — AI insights beside today's meetings
 *                             the Industry Benchmark table
 *                             then the app's own punch card, today's tasks,
 *                             the coming-up rail and "Needs you"
 *   staff                     the personal board: this week's hours, leave
 *                             left, what is due, the punch card and the rail
 *   team lead                 the team board (six-role model): personal
 *                             widgets plus "Team now" and the corrections
 *                             queue they can act on — never the org-wide
 *                             panels (dashboardView, utils/scope.js)
 *
 * Both variants own one payload each and compose widgets that each render their
 * own loading / error / empty state, so this page never branches on data.
 *
 * TWO THINGS THE PROTOTYPE DOES THAT WE DO NOT FAKE:
 *  - the insights and the benchmark are org analytics with no endpoint yet
 *    (contract request 25), so the composition that shows them carries a
 *    `PreviewNotice` naming that scope (§12.1) — the figures come from the
 *    labelled mock, never from a sentence hard-coded in the client;
 *  - the header's Export writes a real CSV of the figures on screen, rather
 *    than the prototype's toast over a button that downloads nothing (9.6).
 *
 * The reviewer's org figures come from `GET /org/dashboard`; the team board
 * (`GET /attendance/team`) belongs to /attendance/team and describes the
 * reviewer's own team, so the two never appear on one screen.
 */
export function HomePage() {
  const { t, i18n } = useTranslation();
  const { t: td } = useTranslation('dashboard');
  const { entitlements, principal, user } = useSession();
  // Six compositions (six-role model): owner, hr, manager, team-lead, team,
  // personal — see utils/scope.js for the mapping.
  const view = dashboardView(principal);
  const isOwner = view === 'owner';
  const isHr = view === 'hr';
  const isManager = view === 'manager';
  const isTeamLead = view === 'team-lead';
  const isOrgView = isOwner || isHr || isManager;
  const canReview = isOrgView;
  const isTeam = view === 'team';
  const has = (key) => entitlements.includes(key);
  const locale = i18n.language === 'ne' ? 'ne-NP' : 'en-GB';
  const { board } = useOrgDashboard({ enabled: isOrgView });

  const now = new Date();
  const { hours } = nepalParts(now);
  const greetingKey =
    hours < 12
      ? 'home.greetingMorning'
      : hours < 17
        ? 'home.greetingAfternoon'
        : 'home.greetingEvening';

  /** The header's Export: a real file of the figures this screen states. */
  const onExport = () => {
    if (!board) return;
    const asOf = board.asOf ?? now.toISOString().slice(0, 10);
    const csv = buildOrgSnapshotCsv(board, td, { asOf });
    triggerBlobDownload(
      new Blob([csv], { type: 'text/csv;charset=utf-8' }),
      `swams-dashboard-${asOf}.csv`,
    );
  };

  return (
    <div className="grid gap-6">
      <PageHeader
        title={t('home.greetingWith', {
          greeting: t(greetingKey),
          name: user?.name ?? '',
        })}
        sub={t('home.tagline', { date: formatDateAd(now, { locale }) })}
        actions={
          <>
            {canReview ? (
              <Button variant="secondary" size="sm" onClick={onExport} disabled={!board}>
                <Download aria-hidden="true" size={15} strokeWidth={1.75} />
                {t('home.export')}
              </Button>
            ) : null}
            <Link
              to="/attendance"
              className="bg-brand text-brand-text rounded-button duration-feedback inline-flex h-8 items-center gap-2 px-3 text-xs font-medium transition-all hover:brightness-110"
            >
              <Fingerprint aria-hidden="true" size={15} strokeWidth={1.75} />
              {t('home.clockAction')}
            </Link>
          </>
        }
      />

      {canReview ? <PreviewNotice badgeKey="home.sampleBadge" bodyKey="home.sampleBody" /> : null}

      {/* Today's live session — the clock-in moment and its running time, above
          the org and staff boards so it is never one scroll away. */}
      <SessionBand />

      {/* .dash-composed — the prototype's `grid-template-columns: 1fr 300px`.
          The 300px rail is reserved only when the reviewer's workforce panel will
          actually render: a staff session has no panel, and an empty fixed track
          left the KPI row and the role board 320px short of the page, a ragged
          edge with a third of the screen blank. */}
      <div
        className={`grid items-stretch gap-5 ${
          canReview ? 'xl:grid-cols-[minmax(0,1fr)_300px]' : ''
        }`}
      >
        <div className="grid gap-5">
          <KpiRow canReview={canReview} tasksEnabled={has('tasks')} />

          {/* The persona's own board — the panel the prototype's staff login
              promises ("each role is its own account"). Staff only: an HR
              reviewer's queue lives on the org board above, and the component
              renders nothing without a staff session. */}
          {!canReview ? <StaffBoard /> : null}

          {/* Role-scoped panels — each role renders its own dashboard structure. */}
          {isOwner ? (
            <OwnerPanel />
          ) : isHr ? (
            <HrPanel />
          ) : isManager ? (
            <ManagerPanel />
          ) : isTeamLead ? (
            <TeamLeadPanel />
          ) : (
            <div className="grid items-stretch gap-5 lg:grid-cols-2">
              <WeekChart />
              <ComingUpCard />
            </div>
          )}
        </div>

        {canReview ? <WorkforcePanel /> : null}
      </div>

      {/* Owner carries the full org analytics stack — charts, insights,
          meetings and the benchmark; manager gets the department charts; HR's
          action queue above is the whole board. */}
      {isOwner ? (
        <>
          <div className="grid items-stretch gap-5 lg:grid-cols-2">
            <OrgTrendChart />
            <DepartmentBars />
          </div>

          <div className="grid items-stretch gap-5 lg:grid-cols-2">
            <OrgInsights />
            <TodayMeetings />
          </div>

          <BenchmarkTable />
        </>
      ) : isManager ? (
        <div className="grid items-stretch gap-5 lg:grid-cols-2">
          <OrgTrendChart />
          <DepartmentBars />
        </div>
      ) : null}

      <div className="grid items-stretch gap-5 lg:grid-cols-2">
        <PunchCard />
        <TasksCard enabled={has('tasks')} />
      </div>

      {/* "Team now" — staff, team-lead and team views show the roster presence strip. */}
      {!isOrgView ? <TeamNow /> : null}

      {/* Corrections/approvals queue for team-lead and team scopes. */}
      {(isTeam || isTeamLead) ? <NeedsYou /> : null}

      {isOrgView ? (
        <div className="grid items-stretch gap-5 lg:grid-cols-2">
          <ComingUpCard />
          <NeedsYou />
        </div>
      ) : null}
    </div>
  );
}

/** The prototype's tinted events rail, in a titled card. */
function ComingUpCard() {
  const { t } = useTranslation('dashboard');

  return (
    <Card className="grid content-start gap-3">
      <CardTitle>{t('events.title')}</CardTitle>
      <UpcomingEvents bare />
    </Card>
  );
}

/**
 * Today's tasks in a titled card. The list used to render bare in the grid,
 * so it arrived as an unlabelled stack of rows beside the punch card — a reader
 * had no way to tell what the rows were (8.9: every section names itself).
 */
function TasksCard({ enabled }) {
  const { t } = useTranslation('dashboard');

  if (!enabled) return null;

  return (
    <Card className="grid content-start gap-3">
      <CardTitle>{t('tasks.title')}</CardTitle>
      <TodayTasks enabled bare />
    </Card>
  );
}

/** HR dashboard panel — action queue + on-leave today (owns its query). */
function HrPanel() {
  const { t } = useTranslation('dashboard');
  const { isLoading, error, refetch, board } = useHrDashboard();

  if (isLoading) return <PanelSkeleton />;
  if (error) return <ErrorState message={error.message} requestId={error.requestId} onRetry={refetch} />;
  if (!board) return null;

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard title={t('hr.pendingLeave')} value={board.actionQueue.pendingLeave.length} caption={t('hr.approvals')} />
        <StatCard title={t('hr.pendingCorrections')} value={board.actionQueue.pendingCorrections.length} caption={t('hr.review')} />
        <StatCard title={t('hr.onLeaveToday')} value={board.presence.onLeaveToday.length} caption={t('hr.away')} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-card border-border bg-surface-raised p-4">
          <div className="font-display text-[11px] font-semibold uppercase tracking-wide text-text-faint mb-3">{t('hr.approveLeave')}</div>
          {board.actionQueue.pendingLeave.map((item) => (
            <PanelRow label={item.title} value={new Date(item.createdAt).toLocaleDateString()} />
          ))}
        </div>
        <div className="rounded-card border-border bg-surface-raised p-4">
          <div className="font-display text-[11px] font-semibold uppercase tracking-wide text-text-faint mb-3">{t('hr.reviewCorrections')}</div>
          {board.actionQueue.pendingCorrections.map((item) => (
            <PanelRow label={item.title} value={new Date(item.createdAt).toLocaleDateString()} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Manager dashboard panel — department capacity vs load (owns its query). */
function ManagerPanel() {
  const { t } = useTranslation('dashboard');
  const { isLoading, error, refetch, board } = useManagerDashboard();

  if (isLoading) return <PanelSkeleton />;
  if (error) return <ErrorState message={error.message} requestId={error.requestId} onRetry={refetch} />;
  if (!board) return null;

  const d = board.department;
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard title={t('mgr.headcount')} value={d.headcount} caption={t('mgr.team')} />
        <StatCard title={t('mgr.present')} value={d.present} caption={t('mgr.onSite')} />
        <StatCard title={t('mgr.rate')} value={d.rate + '%'} caption={t('mgr.attendanceRate')} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-card border-border bg-surface-raised p-4">
          <div className="font-display text-[11px] font-semibold uppercase tracking-wide text-text-faint mb-3">{t('mgr.approvals')}</div>
          <div className="mt-1 text-xs text-text-muted">{t('mgr.pendingLeave', { count: board.approvals.pendingLeave.length })}</div>
          <div className="mt-1 text-xs text-text-muted">{t('mgr.pendingCorrections', { count: board.approvals.pendingCorrections.length })}</div>
        </div>
        <div className="rounded-card border-border bg-surface-raised p-4">
          <div className="font-display text-[11px] font-semibold uppercase tracking-wide text-text-faint mb-3">{t('mgr.absentOnLeave')}</div>
          <div className="mt-1 text-xs text-text-muted">{t('mgr.absent', { count: d.absent })}</div>
          <div className="mt-1 text-xs text-text-muted">{t('mgr.onLeave', { count: d.onLeave })}</div>
          <div className="mt-1 text-xs text-text-muted">{t('mgr.late', { count: d.late })}</div>
        </div>
      </div>
    </div>
  );
}

/** Team lead dashboard panel — workload + blockers + corrections (owns its query). */
function TeamLeadPanel() {
  const { t } = useTranslation('dashboard');
  const { isLoading, error, refetch, board } = useTeamLeadDashboard();

  if (isLoading) return <PanelSkeleton />;
  if (error) return <ErrorState message={error.message} requestId={error.requestId} onRetry={refetch} />;
  if (!board) return null;

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard title={t('tl.headcount')} value={board.team.headcount} caption={t('tl.team')} />
        <StatCard title={t('tl.present')} value={board.team.present} caption={t('tl.onSite')} />
        <StatCard title={t('tl.blockers')} value={board.blockers.length} caption={t('tl.unblock')} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-card border-border bg-surface-raised p-4">
          <div className="font-display text-[11px] font-semibold uppercase tracking-wide text-text-faint mb-3">{t('tl.workload')}</div>
          {board.workload.map((task) => (
            <PanelRow label={task.title} value={task.priority} />
          ))}
        </div>
        <div className="rounded-card border-border bg-surface-raised p-4">
          <div className="font-display text-[11px] font-semibold uppercase tracking-wide text-text-faint mb-3">{t('tl.blockedCards')}</div>
          {board.blockers.map((b) => (
            <PanelRow label={b.title} value={b.lane} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Owner dashboard panel — org aggregates (owns its query). */
function OwnerPanel() {
  const { t } = useTranslation('dashboard');
  const { isLoading, error, refetch, board } = useOwnerDashboard();

  if (isLoading) return <PanelSkeleton />;
  if (error) return <ErrorState message={error.message} requestId={error.requestId} onRetry={refetch} />;
  if (!board) return null;

  const o = board.org;
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 lg:grid-cols-4">
        <StatCard title={t('own.headcount')} value={o.headcount} caption={t('own.staff')} />
        <StatCard title={t('own.onSite')} value={o.onSite} caption={t('own.present')} />
        <StatCard title={t('own.rate')} value={o.rate + '%'} caption={t('own.attendanceRate')} />
        <StatCard title={t('own.pending')} value={o.pendingLeave + o.pendingCorrections} caption={t('own.approvals')} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-card border-border bg-surface-raised p-4">
          <div className="font-display text-[11px] font-semibold uppercase tracking-wide text-text-faint mb-3">{t('own.byDepartment')}</div>
          {(board.departments ?? []).map((dept) => (
            <PanelRow label={dept.name} value={dept.headcount} />
          ))}
        </div>
        <div className="rounded-card border-border bg-surface-raised p-4">
          <div className="font-display text-[11px] font-semibold uppercase tracking-wide text-text-faint mb-3">{t('own.approvalsInbox')}</div>
          <div className="mt-1 text-xs text-text-muted">{t('own.pendingLeave', { count: board.approvals.pendingLeave })}</div>
          <div className="mt-1 text-xs text-text-muted">{t('own.pendingCorrections', { count: board.approvals.pendingCorrections })}</div>
        </div>
      </div>
    </div>
  );
}

/** One row in a role panel's list: label over value, hairline separator. */
function PanelRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-text-muted text-xs">{label}</span>
      <span className="tabular font-medium text-text">{value}</span>
    </div>
  );
}

/** Role-scoped mini-card: title + value + caption. */
function StatCard({ title, value, caption }) {
  return (
    <div className="rounded-card border-border bg-surface-raised p-5">
      <div className="font-display text-[11px] font-semibold uppercase tracking-wide text-text-faint">{title}</div>
      <div className="mt-3 font-display text-2xl leading-none font-bold tracking-tight text-text">{value}</div>
      <div className="mt-1 text-sm text-text-muted">{caption}</div>
    </div>
  );
}

/** Loading state for the role panels — matches KpiRow's skeleton. */
function PanelSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2" aria-busy="true">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} block className="h-36 rounded-card" />
      ))}
    </div>
  );
}
