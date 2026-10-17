import { useTranslation } from 'react-i18next';
import { Avatar, Badge } from '@swams/ui';
import { formatDuration } from '@swams/i18n';

/** Presence id → badge tone and avatar hue. The words carry the meaning (§8.9). */
const TONE = { in: 'success', late: 'warning', leave: 'info', out: 'neutral' };
const HUE = { in: 'teal', late: 'marigold', leave: 'violet', out: 'indigo' };
/** Presence id → the `attendance:team.*` label key. */
const LABEL = { in: 'present', late: 'late', leave: 'onLeave', out: 'notIn' };

/**
 * One person on the manager/HR team board (slice 4): avatar, name, site,
 * presence word, clock-in and worked minutes. A stacked record on mobile and
 * a single grid row on md+ — a table that never scrolls sideways (§8.4).
 * @param {{ row: object }} props
 */
export function TeamBoardRow({ row }) {
  const { t } = useTranslation('attendance');
  return (
    <li className="grid grid-cols-2 items-center gap-x-4 gap-y-2 px-4 py-3 md:grid-cols-[minmax(0,14rem)_repeat(4,minmax(0,6rem))]">
      <div className="col-span-2 flex items-center gap-3 md:col-span-1">
        <Avatar name={row.name} hue={HUE[row.presence] ?? 'indigo'} size="sm" />
        <span className="truncate text-sm font-medium">{row.name}</span>
      </div>

      <Cell label={t('site')} value={row.site} />
      <Cell label={t('column.in')} value={row.clockIn ?? '—'} />
      <Cell
        label={t('worked')}
        value={row.workedMinutes ? formatDuration(row.workedMinutes) : '—'}
      />

      <div className="md:justify-self-start">
        <Badge tone={TONE[row.presence] ?? 'neutral'}>
          {t(`team.${LABEL[row.presence] ?? 'notIn'}`)}
        </Badge>
      </div>
    </li>
  );
}

/** Mobile: label above value. Desktop: value only — the eye reads the row. */
function Cell({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5 md:block">
      <span className="text-text-faint text-xs md:hidden">{label}</span>
      <span className="tabular text-sm">{value}</span>
    </div>
  );
}
