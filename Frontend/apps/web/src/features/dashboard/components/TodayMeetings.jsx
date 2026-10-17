import { useTranslation } from 'react-i18next';
import { Card, CardTitle, ErrorState, Skeleton } from '@swams/ui';
import { useOrgDashboard } from '../hooks/useDashboard.js';

/**
 * Tone → the sanctioned `*-soft` / `*-text` pair plus its accent rule. The
 * prototype filled each block with a saturated brand colour and white text; a
 * solid fill at that saturation cannot clear 4.5:1 for the 11px audience line
 * in both themes (Section 9.3), so the block keeps its shape — tint, 4px
 * accent rule, time over title over audience — and takes the soft pairing.
 */
const TONES = {
  indigo: { accent: 'border-primary', dot: 'bg-primary' },
  violet: { accent: 'border-violet', dot: 'bg-violet' },
  teal: { accent: 'border-info', dot: 'bg-info' },
};

/**
 * TodayMeetings — the prototype's "Today's Meetings" panel
 * (`SWAMS_Unified.html`, `.sched-block` list): the day's booked meetings as
 * time-stamped blocks.
 *
 * Times render as the server sent them (24-hour Nepal wall clock), the same
 * convention the attendance screens use for clock-in times, so one person's
 * 09:00 reads the same everywhere in the product. The audience line is what
 * tells a reader which meeting is theirs.
 */
export function TodayMeetings() {
  const { t } = useTranslation('dashboard');
  const { isLoading, error, refetch, board } = useOrgDashboard();

  if (isLoading) {
    return (
      <Card aria-busy="true" aria-labelledby="meetings-heading">
        <CardTitle id="meetings-heading">{t('meetings.title')}</CardTitle>
        <div className="grid gap-2.5">
          {[0, 1, 2].map((n) => (
            <Skeleton key={n} block className="h-16 rounded-input" />
          ))}
        </div>
      </Card>
    );
  }

  if (error) {
    return <ErrorState message={error.message} requestId={error.requestId} onRetry={refetch} />;
  }

  const rows = board?.meetings ?? [];

  return (
    <Card aria-labelledby="meetings-heading">
      <CardTitle id="meetings-heading">{t('meetings.title')}</CardTitle>

      {rows.length === 0 ? (
        <div className="text-sm">
          <p className="text-text">{t('meetings.emptyTitle')}</p>
          <p className="text-text-faint mt-1">{t('meetings.emptyBody')}</p>
        </div>
      ) : (
        <ul className="grid gap-2.5">
          {rows.map((row) => {
            const tone = TONES[row.tone] ?? TONES.indigo;
            return (
              <li
                key={row.id}
                className={`rounded-input border border-border border-l-4 bg-surface-raised px-3.5 py-2.5 transition-colors duration-feedback hover:bg-surface-sunken ${tone.accent}`}
              >
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot}`}
                  />
                  <p className="text-xs font-bold uppercase tracking-wide text-text-faint tabular">
                    {row.time}
                  </p>
                </div>
                <p className="mt-1 text-sm font-semibold text-text">{row.title}</p>
                <p className="mt-0.5 text-xs text-text-faint">{row.audience}</p>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
