import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Download, Fingerprint } from 'lucide-react';
import { Button, Card, CardTitle, PageHeader, PreviewNotice } from '@swams/ui';
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
import { useOrgDashboard } from '../hooks/useDashboard.js';
import { buildOrgSnapshotCsv } from '../utils/orgSnapshot.js';

/**
 * Home — a straight port of the owner's prototype (`SWAMS_Unified.html`,
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
  // Three compositions (six-role model): org (executive/HR/manager), team
  // (supervisor), personal (staff) — see utils/scope.js for the mapping.
  const view = dashboardView(principal);
  const isOrg = view === 'org';
  const canReview = isOrg;
  const isTeam = view === 'team';
  const has = (key) => entitlements.includes(key);
  const locale = i18n.language === 'ne' ? 'ne-NP' : 'en-GB';
  const { board } = useOrgDashboard({ enabled: isOrg });

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

          {canReview ? (
            <div className="grid items-stretch gap-5 lg:grid-cols-2">
              <OrgTrendChart />
              <DepartmentBars />
            </div>
          ) : (
            <div className="grid items-stretch gap-5 lg:grid-cols-2">
              <WeekChart />
              <ComingUpCard />
            </div>
          )}
        </div>

        {canReview ? <WorkforcePanel /> : null}
      </div>

      {canReview ? (
        <>
          <div className="grid items-stretch gap-5 lg:grid-cols-2">
            <OrgInsights />
            <TodayMeetings />
          </div>

          <BenchmarkTable />
        </>
      ) : null}

      <div className="grid items-stretch gap-5 lg:grid-cols-2">
        <PunchCard />
        <TasksCard enabled={has('tasks')} />
      </div>

      {/* "Team now" closes a staff or team-lead Home (§9.9): the roster's
          presence strip, the one place the demo team is named person by person. */}
      {!canReview ? <TeamNow /> : null}

      {/* A supervisor's actionable queue: corrections they can approve, with
          their own "needs info" items — the team lens of "Needs you". */}
      {isTeam ? <NeedsYou /> : null}

      {canReview ? (
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
