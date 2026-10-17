import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin } from 'lucide-react';
import { Button, ErrorState, Skeleton } from '@swams/ui';
import { formatClock, formatDuration } from '@swams/i18n';
import { workedMinutes } from '@swams/domain';
import { useAttendancePolicy, useAttendanceToday } from '../hooks/useAttendance.js';
import { usePunch } from '../hooks/usePunch.js';
import { PunchStatusNote } from './PunchStatusNote.jsx';
import { ShiftStrip } from './ShiftStrip.jsx';
import { TimerRing } from './TimerRing.jsx';

/**
 * PunchCard (§7.1, §9.1): the hero of staff Home. One memorable element — the
 * timer ring settling when you clock in — and everything else calm. Renders
 * only from the machine's `status`; never from scattered booleans.
 */
export function PunchCard() {
  const { t } = useTranslation('attendance');
  const { policy, sites, isLoading: policyLoading } = useAttendancePolicy();
  const today = useAttendanceToday();
  const site = today.site ?? sites[0] ?? null;
  const punch = usePunch({ site, policy });

  const [now, setNow] = useState(() => new Date());
  const running = punch.status === 'working' || punch.status === 'onBreak';

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => setNow(new Date()), 1_000);
    return () => clearInterval(id);
  }, [running]);

  // Resume an open server session — but only before this mount has punched.
  // After a confirmed clock-out the card is legitimately idle, and the cached
  // `today` query can still hold the previous session until it refetches; a
  // blind hydrate there would show a worker as clocked in right after they
  // clocked out.
  const canHydrate = !punch.context.lastPunch && !punch.context.startedAt;
  useEffect(() => {
    if (today.session && punch.status === 'idle' && canHydrate) {
      punch.send({ type: 'HYDRATE_OPEN', session: today.session });
    }
  }, [today.session, punch.status, canHydrate, punch]);

  const workedMin = useMemo(
    () => workedMinutes([{ start: punch.context.startedAt, end: null }], { now }),
    [punch.context.startedAt, now],
  );
  const expectedMin = today.schedule?.expectedMinutes ?? policy?.workdayMinutes ?? 480;

  if (today.isLoading || policyLoading) {
    return <Skeleton className="rounded-hero h-56 w-full" />;
  }
  if (today.error) {
    return (
      <ErrorState
        message={today.error.message}
        requestId={today.error.requestId}
        onRetry={today.refetch}
      />
    );
  }

  return (
    <section
      aria-labelledby="punch-heading"
      className="bg-surface border-border rounded-hero shadow-1 grid gap-5 border p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="punch-heading" className="text-md">
          {t('today')}
        </h2>
        {site?.name ? (
          <p className="text-text-muted flex items-center gap-1 text-sm">
            <MapPin aria-hidden="true" size={14} strokeWidth={1.75} />
            {site.name}
          </p>
        ) : null}
      </div>

      <ShiftStrip schedule={today.schedule} running={running} />

      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <TimerRing
          workedMinutes={running ? workedMin : 0}
          expectedMinutes={expectedMin}
          label={running ? formatDuration(workedMin) : formatClock(now)}
          sublabel={running ? t('worked') : (today.schedule?.shift ?? t('clockIn'))}
        />

        <div className="min-w-0 flex-1">
          {punch.status === 'idle' && today.session == null ? (
            <>
              <p className="text-text-muted text-sm">{t('policyNote')}</p>
              <div className="mt-3">
                <Button size="lg" onClick={() => punch.send({ type: 'PUNCH_IN', kind: 'in' })}>
                  {t('clockIn')}
                </Button>
              </div>
            </>
          ) : null}

          {punch.status === 'idle' && today.session != null ? (
            <p className="text-text-muted text-sm">
              {t('outAt', { time: formatClock(new Date(today.session.lastPunch?.at ?? now)) })}
            </p>
          ) : null}

          {punch.status === 'working' ? (
            <>
              <p className="text-text-muted text-sm">
                {t('checkedInAt', { time: formatClock(new Date(punch.context.startedAt)) })}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => punch.send({ type: 'BREAK' })}>
                  {t('takeBreak')}
                </Button>
                <Button onClick={() => punch.send({ type: 'PUNCH_OUT' })}>{t('clockOut')}</Button>
              </div>
            </>
          ) : null}

          {punch.status === 'onBreak' ? (
            <>
              <p className="text-text-muted text-sm">
                {t('onBreakSince', {
                  time: formatClock(new Date(punch.context.breakStartedAt)),
                })}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => punch.send({ type: 'RESUME' })}>
                  {t('backToWork')}
                </Button>
                <Button onClick={() => punch.send({ type: 'PUNCH_OUT' })}>{t('clockOut')}</Button>
              </div>
            </>
          ) : null}

          {punch.status === 'confirmOut' ? (
            <>
              <h3 className="text-md">{t('confirmOutTitle')}</h3>
              <p className="text-text-muted mt-1 text-sm">
                {t('confirmOutBody', {
                  worked: formatDuration(workedMin),
                  overtime: formatDuration(Math.max(0, workedMin - expectedMin)),
                })}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button onClick={() => punch.send({ type: 'PUNCH_OUT' })}>
                  {t('confirmClockOut')}
                </Button>
                <Button variant="secondary" onClick={() => punch.send({ type: 'CANCEL' })}>
                  {t('notYet')}
                </Button>
              </div>
            </>
          ) : null}

          <PunchStatusNote
            status={punch.status}
            context={punch.context}
            send={punch.send}
            queuedCount={punch.queued.length}
          />
        </div>
      </div>
    </section>
  );
}
