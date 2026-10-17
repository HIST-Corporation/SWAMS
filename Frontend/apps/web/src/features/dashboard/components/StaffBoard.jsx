import { useTranslation } from 'react-i18next';
import { CircleCheck, Inbox, ListChecks, ShieldAlert } from 'lucide-react';
import { Avatar, Badge, Card, CardTitle, EmptyState, ErrorState, Skeleton } from '@swams/ui';
import { formatDateAd } from '@swams/i18n';
import { useSession } from '../../../hooks/useSession.js';
import { useStaffBoard } from '../hooks/useDashboard.js';

/** Queue status → icon + tone; the word beside it carries the meaning (8.9). */
const STATUS = {
  open: { tone: 'neutral', Icon: Inbox },
  review: { tone: 'info', Icon: ListChecks },
  blocked: { tone: 'warning', Icon: ShieldAlert },
  done: { tone: 'success', Icon: CircleCheck },
};
const KIND_TONE = {
  review: 'info',
  test: 'primary',
  deploy: 'success',
  bug: 'danger',
  doc: 'neutral',
  design: 'violet',
  ops: 'warning',
};
const PRIORITY_TONE = { high: 'danger', medium: 'warning', low: 'neutral' };
/**
 * Tone → a literal text utility, because a class built by string concatenation
 * is invisible to Tailwind's content scan and would ship unstyled (Section 8.2).
 */
const TONE_TEXT = {
  neutral: 'text-text-muted',
  primary: 'text-primary',
  info: 'text-info-text',
  success: 'text-success-text',
  warning: 'text-warning-text',
  danger: 'text-danger-text',
};

/**
 * StaffBoard — the persona's own work board (contract request 26), the panel
 * the prototype promises on its staff login ("each role is its own demo
 * account — pick one to see that board"). Frontend, Backend, QA and DevOps each
 * open Home on a DIFFERENT queue and pod, so signing in as a colleague is
 * visibly a different desk rather than the same page with another name.
 *
 * It reads `GET /staff/board`, which picks the role from the session — a
 * component never tells the API which board to hand over. Nothing here is a
 * figure the payload did not state: `counts` comes from the server, the client
 * only formats it (Section 7.6).
 *
 * States: loading (skeleton), error (request ID + retry), no staff session
 * (renders nothing — hidden, not empty, 4.1) and an empty queue.
 *
 * Layout: the counts strip, then the queue beside the pod. A queue row is two
 * zones — what and where on the left, how urgent on the right — because four
 * pills and two text runs on one 71px line left the title 320px of a 500px
 * column and read as a wall. The pod is separated by a hairline at `lg`, so the
 * two halves of the panel are told apart by a line rather than by a gap.
 */
export function StaffBoard() {
  const { t, i18n } = useTranslation('dashboard');
  const { t: tn } = useTranslation('nav');
  const { user } = useSession();
  const staffRole = user?.staffRole;
  const { isLoading, error, refetch, board } = useStaffBoard({ staffRole });

  if (staffRole && isLoading) return <BoardSkeleton />;

  if (error) {
    return <ErrorState message={error.message} requestId={error.requestId} onRetry={refetch} />;
  }

  // No staff session (an HR reviewer has no personal board) → no empty box.
  if (!board) return null;

  const locale = i18n.language === 'ne' ? 'ne-NP' : 'en-GB';
  const jobTitle = user?.jobKey ? tn(`nav.job.${user.jobKey}`) : tn('nav.role.staff');

  return (
    <Card aria-labelledby="staff-board-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle id="staff-board-heading" className="mb-0">
          {t('board.title')}
        </CardTitle>
        <Badge tone="primary">{jobTitle}</Badge>
      </div>

      {/* One strip instead of four tiles: at 1440 a 368px tile around a single
          digit was mostly empty panel, and four of them pushed the queue (the
          part people read) below the fold. Hairlines do the separating, so the
          counts still line up with the columns above them. */}
      <dl className="bg-surface-sunken rounded-input mt-4 grid grid-cols-2 sm:grid-cols-4">
        {Object.entries(STATUS).map(([key, { tone, Icon }]) => (
          <div
            key={key}
            className="border-border px-4 py-3 [&:nth-child(2n)]:border-l sm:border-l sm:first:border-l-0"
          >
            <dt className="flex items-center gap-1.5 text-xs">
              <Icon aria-hidden="true" size={14} strokeWidth={1.75} className={TONE_TEXT[tone]} />
              {t(`board.count.${key}`)}
            </dt>
            <dd className="font-display tabular mt-1 text-lg leading-none font-bold">
              {board.counts[key]}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px] xl:grid-cols-[minmax(0,1fr)_300px]">
        <QueueList items={board.queue} asOf={board.asOf} locale={locale} />
        <PodList people={board.pod} />
      </div>

      {/* The queue is a labelled fixture until assignments exist server-side (§12.1). */}
      <p className="text-text-faint mt-4 text-[11px]">{t('board.sampleNote')}</p>
    </Card>
  );
}

/** The queue: one row per item — what it is, which kind, when, how urgent. */
function QueueList({ items, asOf, locale }) {
  const { t } = useTranslation('dashboard');

  if (items.length === 0) {
    return <EmptyState title={t('board.queueEmptyTitle')} body={t('board.queueEmptyBody')} />;
  }

  return (
    <ul className="divide-border divide-y">
      {items.map((item) => {
        const { tone, Icon } = STATUS[item.status] ?? STATUS.open;
        const due =
          item.due == null
            ? t('board.noDue')
            : item.due === asOf
              ? t('board.dueToday')
              : t('board.dueOn', {
                  when: formatDateAd(new Date(`${item.due}T12:00:00.000Z`), { locale }),
                });

        return (
          <li key={item.id} className="flex items-start gap-3 py-3.5">
            <span className="bg-surface-sunken text-text-muted mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-input">
              <Icon aria-hidden="true" size={14} strokeWidth={1.75} className={TONE_TEXT[tone]} />
            </span>

            <div className="min-w-0 flex-1">
              <p
                className={`text-sm leading-snug ${item.status === 'done' ? 'text-text-muted' : ''}`}
              >
                {item.title}
              </p>
              <p className="text-text-faint mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
                <Badge tone={KIND_TONE[item.kind] ?? 'neutral'}>
                  {t(`board.kind.${item.kind}`)}
                </Badge>
                <span className="tabular">{item.meta}</span>
                <span className="tabular">{due}</span>
              </p>
            </div>

            {/* Urgency, stacked: side by side the two pills took ~150px off the
                title and made every row wrap. */}
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <Badge tone={tone}>{t(`board.status.${item.status}`)}</Badge>
              <Badge tone={PRIORITY_TONE[item.priority] ?? 'neutral'}>
                {t(`board.priority.${item.priority}`)}
              </Badge>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The pod: this persona's teammates, presence named beside the avatar. The
 * "n of m in today" line is a count of the rows the payload stated (7.6) — the
 * rail beside a six-row queue otherwise ends in half a screen of nothing.
 */
function PodList({ people }) {
  const { t } = useTranslation('dashboard');
  const inToday = people.filter((person) => person.presence === 'in').length;

  return (
    <section
      aria-labelledby="staff-board-pod-heading"
      className="lg:border-border lg:border-l lg:pl-5"
    >
      <h3
        id="staff-board-pod-heading"
        className="text-text-faint font-display text-xs font-semibold tracking-wide uppercase"
      >
        {t('board.podTitle')}
      </h3>
      {people.length > 0 ? (
        <p className="text-text-faint tabular mt-1 text-xs">
          {t('board.podIn', { count: inToday, total: people.length })}
        </p>
      ) : null}

      {people.length === 0 ? (
        <p className="text-text-faint mt-2.5 text-sm">{t('board.podEmpty')}</p>
      ) : (
        <ul className="mt-2.5 grid gap-2">
          {people.map((person) => (
            <li
              key={person.id}
              className="bg-surface-sunken flex items-center gap-2.5 rounded-input px-3 py-2"
            >
              <Avatar name={person.name} size="sm" src={`/avatars/${person.id}.svg`} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{person.name}</span>
                <span className="text-text-faint block text-[11px]">
                  {t(`presence.${person.presence}`)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function BoardSkeleton() {
  return (
    <Card aria-busy="true" aria-labelledby="staff-board-heading">
      <Skeleton className="h-4 w-40" />
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[0, 1, 2, 3].map((n) => (
          <Skeleton key={n} block className="h-16 rounded-input" />
        ))}
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px] xl:grid-cols-[minmax(0,1fr)_300px]">
        <Skeleton block className="h-48 rounded-card" />
        <Skeleton block className="h-48 rounded-card" />
      </div>
    </Card>
  );
}
