import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Fingerprint, MapPin } from 'lucide-react';
import { Skeleton } from '@swams/ui';
import { formatClock, formatDuration } from '@swams/i18n';
import { workedMinutes } from '@swams/domain';
import { useAttendanceToday } from '../../attendance/index.js';

/** `Date` → `HH:MM:SS`, ticking the way a session timer does. */
function clockHms(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * Today's session band — the staff board's opening line: whether you are
 * clocked in, the live session clock (`HH:MM:SS`, since clock-in), the site
 * and the expected clock-out. Reads `GET /attendance/today` through the
 * attendance feature's public hook (§6.2 rule 1), so the band can never
 * disagree with the punch card about your session (§7.6).
 */
export function SessionBand() {
  const { t } = useTranslation('dashboard');
  const { isLoading, session, site, schedule } = useAttendanceToday();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!session) return undefined;
    const id = setInterval(() => setNow(new Date()), 1_000);
    return () => clearInterval(id);
  }, [session]);

  if (isLoading) {
    return <Skeleton className="rounded-hero h-32 w-full" />;
  }

  if (!session) {
    return (
      <section
        aria-labelledby="session-heading"
        className="bg-surface border-border grid gap-2 rounded-hero border p-5"
      >
        <h2 id="session-heading" className="text-md">
          {t('session.title')}
        </h2>
        <p className="text-text-muted text-sm">{t('session.notClockedIn')}</p>
        <div className="mt-1">
          <Link
            to="/attendance"
            className="bg-brand text-brand-text rounded-button inline-flex h-8 items-center gap-2 px-3 text-xs font-medium"
          >
            <Fingerprint aria-hidden="true" size={15} strokeWidth={1.75} />
            {t('session.clockInNow')}
          </Link>
        </div>
      </section>
    );
  }

  const startedAt = new Date(session.startedAt);
  const worked = workedMinutes([{ start: session.startedAt, end: null }], { now });

  return (
    <section
      aria-labelledby="session-heading"
      className="border-brand bg-surface rounded-hero grid gap-4 border p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
    >
      <div className="min-w-0">
        <p className="text-text-muted text-xs font-semibold tracking-wide uppercase">
          {t('session.title')}
        </p>
        <p className="font-display tabular mt-1 text-4xl leading-none font-bold tracking-tight">
          {clockHms(now)}
        </p>
        <p className="text-text-muted mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span>{t('session.clockedInAt', { time: formatClock(startedAt) })}</span>
          <span className="tabular">
            {t('session.workedSoFar', { value: formatDuration(worked) })}
          </span>
          {site?.name ? (
            <span className="flex items-center gap-1">
              <MapPin aria-hidden="true" size={12} strokeWidth={1.75} />
              {site.name}
            </span>
          ) : null}
        </p>
      </div>
      <dl className="grid gap-2 sm:text-right">
        <SessionFact
          label={t('session.expectedOut')}
          value={schedule?.end ?? schedule?.shift ?? '—'}
        />
        <SessionFact label={t('session.shift')} value={schedule?.shift ?? '—'} />
      </dl>
    </section>
  );
}

function SessionFact({ label, value }) {
  return (
    <div>
      <dt className="text-text-faint text-xs">{label}</dt>
      <dd className="tabular text-sm font-semibold">{value}</dd>
    </div>
  );
}
