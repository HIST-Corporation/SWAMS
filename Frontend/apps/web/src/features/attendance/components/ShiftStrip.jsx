import { useTranslation } from 'react-i18next';
import { formatDuration } from '@swams/i18n';

/**
 * ShiftStrip (§7.1): the day's schedule as one arranged row — start, end and
 * length side by side, with the expected clock-out once a session is running.
 * The schedule comes from the server's `/attendance/today` payload; nothing
 * here recomputes policy (§7.6).
 *
 * @param {{ schedule: {shift?: string, start?: string, end?: string, expectedMinutes?: number}|null, running: boolean }} props
 */
export function ShiftStrip({ schedule, running }) {
  const { t } = useTranslation('attendance');

  if (!schedule) return null;

  const items = [
    { label: t('shiftStrip.start'), value: schedule.start ?? '—' },
    { label: t('shiftStrip.end'), value: schedule.end ?? '—' },
    {
      label: t('shiftStrip.length'),
      value: schedule.expectedMinutes ? formatDuration(schedule.expectedMinutes) : '—',
    },
  ];
  if (running && schedule.end) {
    items.push({ label: t('shiftStrip.expectedOut'), value: schedule.end });
  }

  return (
    <section
      aria-label={schedule.shift}
      className="bg-surface-sunken flex flex-wrap items-center gap-x-6 gap-y-2 rounded-input px-4 py-2.5"
    >
      <span className="text-text-muted text-xs font-semibold">{schedule.shift}</span>
      <dl className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
        {items.map((item) => (
          <div key={item.label} className="flex items-baseline gap-1.5">
            <dt className="text-text-faint text-xs">{item.label}</dt>
            <dd className="tabular text-sm font-medium">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
