import { useTranslation } from 'react-i18next';
import { Activity, Building2, Eye, ShieldCheck, TriangleAlert } from 'lucide-react';
import { StatTile } from '@swams/ui';

/**
 * Overview — the four platform counters, derived from the fixtures in one
 * place (contract request 31: `GET /platform/summary`).
 */
export function OverviewSection({ summary }) {
  const { t } = useTranslation('console');

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile
        icon={<Building2 aria-hidden="true" size={18} strokeWidth={1.75} />}
        label={t('overview.orgs')}
        value={String(summary.orgs)}
        hint={t('overview.orgsHint')}
      />
      <StatTile
        icon={<Activity aria-hidden="true" size={18} strokeWidth={1.75} />}
        label={t('overview.active')}
        value={String(summary.active)}
        hint={t('overview.activeHint')}
      />
      <StatTile
        icon={<ShieldCheck aria-hidden="true" size={18} strokeWidth={1.75} />}
        label={t('overview.admins')}
        value={String(summary.admins)}
        hint={t('overview.adminsHint')}
      />
      <StatTile
        icon={<TriangleAlert aria-hidden="true" size={18} strokeWidth={1.75} />}
        label={t('overview.incidents')}
        value={String(summary.incidents)}
        hint={t('overview.incidentsHint')}
      />
    </div>
  );
}

/**
 * The honest-mock banner (Section 12.1, the console's own PreviewNotice): the
 * console namespace owns its copy, so the shared pattern's `common` defaults
 * do not fit; the visual language is identical on purpose.
 */
export function FixtureNotice() {
  const { t } = useTranslation('console');
  return (
    <aside className="bg-info-soft text-info-text border-info/30 flex items-start gap-3 rounded-card border px-4 py-3 text-sm">
      <Eye aria-hidden="true" className="mt-0.5 shrink-0" size={16} strokeWidth={1.75} />
      <p>
        <span className="font-semibold">{t('fixtureBadge')}</span>
        <span className="opacity-90"> — {t('fixtureBody')}</span>
      </p>
    </aside>
  );
}
