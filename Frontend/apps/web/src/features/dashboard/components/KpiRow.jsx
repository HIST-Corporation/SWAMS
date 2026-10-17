import { useTranslation } from 'react-i18next';
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  CircleCheck,
  Clock,
  History,
  ListChecks,
  TrendingUp,
  TriangleAlert,
  Users,
} from 'lucide-react';
import { ErrorState, Skeleton, StatTile } from '@swams/ui';
import { formatDuration, formatPercent } from '@swams/i18n';
import { useAttendanceHistory } from '../../attendance/index.js';
import { useLeaveBalance, useOrgDashboard, useTodayTasks } from '../hooks/useDashboard.js';
import { HISTORY_WINDOW, lastWeekMinutes, weekStats } from '../weekStats.js';

/**
 * KpiRow — the prototype's `.grid-4` of `.stat-card`s at the top of
 * `#page-dashboard` (SWAMS_Unified.html). A reviewer sees the company board
 * (Present today / Total employees / On leave / Absent); a staff member sees
 * their own three (This week / Leave left / Due today).
 *
 * Both variants come from ONE payload: the reviewer's four tiles and the
 * workforce donut below them read the same `GET /org/dashboard` response, so
 * "Present today" and the donut's centre can never disagree (Section 7.6). The
 * staff variant reads the worker's own history — a different question, answered
 * by a different endpoint.
 *
 * Every figure is one the server stated; the client formats, never derives.
 * The first tile is the prototype's `.hero-lime` — the one filled panel.
 */
export function KpiRow({ canReview, tasksEnabled = true }) {
  return canReview ? <TeamKpis /> : <PersonalKpis tasksEnabled={tasksEnabled} />;
}

function TeamKpis() {
  const { t } = useTranslation('dashboard');
  const { isLoading, error, refetch, board } = useOrgDashboard();

  if (isLoading) return <KpiSkeleton count={4} />;
  if (error) {
    return <ErrorState message={error.message} requestId={error.requestId} onRetry={refetch} />;
  }

  const k = board?.kpi ?? {
    present: 0,
    rate: 0,
    headcount: 0,
    headcountDelta: 0,
    onLeave: 0,
    pendingLeave: 0,
    absent: 0,
    unexcused: 0,
  };
  const rate = formatPercent(k.rate);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile
        tone="brand"
        icon={<CircleCheck aria-hidden="true" size={18} strokeWidth={1.75} />}
        badge={
          <TrendPill
            tone="brand"
            icon={<TrendingUp aria-hidden="true" size={12} strokeWidth={2.25} />}
            label={rate}
            srText={t('kpi.rateLong', { value: rate })}
          />
        }
        label={t('kpi.presentToday')}
        value={String(k.present)}
      />
      <StatTile
        icon={<Users aria-hidden="true" size={18} strokeWidth={1.75} />}
        badge={
          k.headcountDelta === 0 ? null : (
            <TrendPill
              tone={k.headcountDelta > 0 ? 'success' : 'warning'}
              icon={
                k.headcountDelta > 0 ? (
                  <ArrowUpRight aria-hidden="true" size={12} strokeWidth={2.25} />
                ) : (
                  <ArrowDownRight aria-hidden="true" size={12} strokeWidth={2.25} />
                )
              }
              label={`${k.headcountDelta > 0 ? '+' : '−'}${Math.abs(k.headcountDelta)}`}
              srText={t(k.headcountDelta > 0 ? 'kpi.headcountUp' : 'kpi.headcountDown', {
                count: Math.abs(k.headcountDelta),
              })}
            />
          )
        }
        label={t('kpi.totalEmployees')}
        value={String(k.headcount)}
      />
      <StatTile
        icon={<History aria-hidden="true" size={18} strokeWidth={1.75} />}
        badge={
          k.pendingLeave > 0 ? (
            <TrendPill tone="warning" label={t('kpi.pendingLeave', { count: k.pendingLeave })} />
          ) : null
        }
        label={t('kpi.onLeave')}
        value={String(k.onLeave)}
      />
      <StatTile
        icon={<TriangleAlert aria-hidden="true" size={18} strokeWidth={1.75} />}
        badge={
          k.unexcused > 0 ? (
            <TrendPill tone="danger" label={t('kpi.unexcused', { count: k.unexcused })} />
          ) : null
        }
        label={t('kpi.absent')}
        value={String(k.absent)}
      />
    </div>
  );
}

function PersonalKpis({ tasksEnabled }) {
  const { t } = useTranslation('dashboard');
  const history = useAttendanceHistory({ perPage: HISTORY_WINDOW });
  const leave = useLeaveBalance();
  const tasks = useTodayTasks({ enabled: tasksEnabled });

  if (history.isLoading) return <KpiSkeleton count={3} />;
  if (history.error) {
    return (
      <ErrorState
        message={history.error.message}
        requestId={history.error.requestId}
        onRetry={history.refetch}
      />
    );
  }

  const week = weekStats(history.rows);
  // Same number of days into both weeks, so the chip never reads the week so
  // far as a collapse (README "Rebuild notes").
  const previous = lastWeekMinutes(history.rows, new Date(), week.elapsed);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <StatTile
        tone="brand"
        icon={<Clock aria-hidden="true" size={18} strokeWidth={1.75} />}
        label={t('week.title')}
        value={week.minutes > 0 ? formatDuration(week.minutes) : '—'}
        hint={week.days > 0 ? t('week.hint', { count: week.days }) : t('week.empty')}
        badge={
          previous === null || previous === week.minutes ? null : (
            <DeltaChip minutes={week.minutes - previous} />
          )
        }
      />

      {leave.isLoading ? (
        <Skeleton block className="h-36 rounded-card" />
      ) : leave.error ? (
        <ErrorState
          message={leave.error.message}
          requestId={leave.error.requestId}
          onRetry={leave.refetch}
        />
      ) : (
        <StatTile
          icon={<CalendarClock aria-hidden="true" size={18} strokeWidth={1.75} />}
          label={t('leave.title')}
          value={leave.balance ? t('leave.days', { count: leave.balance.remaining }) : '—'}
          hint={t('leave.hint')}
        />
      )}

      {tasks.isLoading ? (
        <Skeleton block className="h-36 rounded-card" />
      ) : tasks.error ? (
        <ErrorState
          message={tasks.error.message}
          requestId={tasks.error.requestId}
          onRetry={tasks.refetch}
        />
      ) : (
        <StatTile
          // Three tiles in a two-column grid leave the third one beside an empty
          // half-row; it spans both columns until the row can hold three.
          className="sm:col-span-2 xl:col-span-1"
          icon={<ListChecks aria-hidden="true" size={18} strokeWidth={1.75} />}
          label={t('stat.dueToday')}
          value={String(tasks.rows.length)}
          hint={
            tasks.rows.length > 0
              ? t('stat.dueTodayHint', { count: tasks.rows.length })
              : t('tasks.emptyTitle')
          }
        />
      )}
    </div>
  );
}

/**
 * The prototype's `.trend-pill` — a small pill on a stat card's head row. The
 * visible label is the short figure (`89.4%`, `+4`, `2 pending`); when it is
 * only a number, `srText` supplies the sentence a screen reader needs, because
 * a bare `+4` names nothing (Section 8.9).
 */
function TrendPill({ tone = 'neutral', icon, label, srText }) {
  const TONES = {
    // The pill sits on the brand-filled StatTile. A white veil over bright
    // dark-theme brand (#2E5CFF) lands at 3.91:1 under white ink — e2e caught
    // it. `on-primary` flips with the theme: white at 16% in light (unchanged,
    // 5.0:1) and near-black at 16% in dark, deepening the chip to 6.5:1 while
    // the label stays white either way.
    brand: 'bg-on-primary/[0.16] text-brand-text',
    success: 'bg-success-soft text-success-text',
    warning: 'bg-warning-soft text-warning-text',
    danger: 'bg-danger-soft text-danger-text',
  };

  return (
    <span
      className={`rounded-pill inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold ${
        TONES[tone] ?? TONES.success
      }`}
    >
      {icon}
      <span className="tabular">{label}</span>
      {srText ? <span className="sr-only">{srText}</span> : null}
    </span>
  );
}

/** The prototype's `.trend-pill`: green up, red down, with a real sentence. */
function DeltaChip({ minutes }) {
  const { t } = useTranslation('dashboard');
  const up = minutes > 0;
  const delta = formatDuration(Math.abs(minutes));
  const Icon = up ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={`rounded-pill inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold ${
        up ? 'bg-success-soft text-success-text' : 'bg-danger-soft text-danger-text'
      }`}
    >
      <Icon aria-hidden="true" size={12} strokeWidth={2.25} />
      <span aria-hidden="true" className="tabular">
        {up ? '+' : '−'}
        {delta}
      </span>
      <span className="sr-only">
        {up ? t('week.vsLastWeekMore', { delta }) : t('week.vsLastWeekLess', { delta })}
      </span>
    </span>
  );
}

function KpiSkeleton({ count }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2" aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} block className="h-36 rounded-card" />
      ))}
    </div>
  );
}
