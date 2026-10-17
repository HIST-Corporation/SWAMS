import { useTranslation } from 'react-i18next';
import { Badge } from '@swams/ui';
import { formatDateAd, formatDuration } from '@swams/i18n';

/** Status → badge tone. Text always accompanies the colour (§8.9 rule). */
const TONE = {
  present: 'success',
  late: 'warning',
  absent: 'danger',
  half_day: 'warning',
  leave: 'info',
  holiday: 'neutral',
};

/**
 * One attendance day. A stacked record on mobile (label above value, two per
 * row) and a single row on md+ — a table that never scrolls sideways (§8.4).
 * @param {{ row: object }} props
 */
export function PunchHistoryRow({ row }) {
  const { t, i18n } = useTranslation('attendance');
  const locale = i18n.language === 'ne' ? 'ne-NP' : 'en-GB';
  const date = new Date(`${row.date}T12:00:00.000Z`);
  const tone = TONE[row.status] ?? 'neutral';

  return (
    <li className="grid grid-cols-2 items-center gap-x-4 gap-y-2 px-4 py-3 md:grid-cols-[1fr_repeat(4,minmax(0,6rem))]">
      <div className="col-span-2 flex items-center justify-between gap-3 md:col-span-1 md:block">
        <time dateTime={row.date} className="tabular text-sm font-medium">
          {formatDateAd(date, { locale })}
        </time>
        <span className="md:hidden">
          <Badge tone={tone}>{t(`status.${row.status}`)}</Badge>
        </span>
      </div>

      <Cell label={t('column.in')} value={row.clockIn ?? '—'} />
      <Cell label={t('column.out')} value={row.clockOut ?? '—'} />
      <Cell
        label={t('column.worked')}
        value={row.workedMinutes ? formatDuration(row.workedMinutes) : '—'}
      />

      <div className="hidden md:block">
        <Badge tone={tone}>{t(`status.${row.status}`)}</Badge>
      </div>

      {row.exception ? (
        <p className="text-warning-text col-span-2 text-xs md:col-span-5">
          {t(`exception.${row.exception}`)}
        </p>
      ) : null}
    </li>
  );
}

/** Mobile: label above value. Desktop: value only — the column header carries it. */
function Cell({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5 md:block">
      <span className="text-text-faint text-xs md:hidden">{label}</span>
      <span className="tabular text-sm">{value}</span>
    </div>
  );
}
