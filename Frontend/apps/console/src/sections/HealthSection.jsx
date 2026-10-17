import { useTranslation } from 'react-i18next';
import { CircleCheck, CircleAlert } from 'lucide-react';
import { Badge, Card, CardTitle } from '@swams/ui';
import { CONSOLE_HEALTH } from '../data/fixtures.js';

/**
 * System health — sample service status (contract request 31: `GET
 * /platform/health`). Status is a word plus an icon, never colour alone
 * (Section 8.9).
 */
export function HealthSection() {
  const { t } = useTranslation('console');

  return (
    <Card aria-labelledby="health-heading">
      <CardTitle id="health-heading">{t('health.title')}</CardTitle>
      <ul className="border-border divide-y divide-border rounded-card border">
        {CONSOLE_HEALTH.map((service) => (
          <li key={service.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-sm font-medium">{service.service}</span>
            <span className="flex items-center gap-3">
              <span className="tabular text-text-muted text-sm">{service.uptime}</span>
              <Badge tone={service.ok ? 'success' : 'danger'}>
                {service.ok ? (
                  <CircleCheck aria-hidden="true" size={11} strokeWidth={2.5} />
                ) : (
                  <CircleAlert aria-hidden="true" size={11} strokeWidth={2.5} />
                )}
                {service.ok ? t('health.ok') : t('health.degraded')}
              </Badge>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
