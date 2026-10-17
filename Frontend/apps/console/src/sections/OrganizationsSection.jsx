import { useTranslation } from 'react-i18next';
import { Badge, Card, CardTitle } from '@swams/ui';
import { CONSOLE_ORGS } from '../data/fixtures.js';

/**
 * Organizations — the tenant list the console exists to administer. All rows
 * are labelled development fixtures (contract request 31: `GET /platform/orgs`).
 */
export function OrganizationsSection() {
  const { t } = useTranslation('console');

  return (
    <Card aria-labelledby="orgs-heading">
      <CardTitle id="orgs-heading">{t('orgs.title')}</CardTitle>
      <div className="border-border overflow-x-auto rounded-card border">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-border bg-surface-sunken border-b text-xs">
              <th scope="col" className="text-text-faint px-4 py-2.5 font-medium">
                {t('orgs.name')}
              </th>
              <th scope="col" className="text-text-faint px-4 py-2.5 font-medium">
                {t('orgs.plan')}
              </th>
              <th scope="col" className="text-text-faint px-4 py-2.5 text-right font-medium">
                {t('orgs.seats')}
              </th>
              <th scope="col" className="text-text-faint px-4 py-2.5 font-medium">
                {t('orgs.status')}
              </th>
              <th scope="col" className="text-text-faint px-4 py-2.5 font-medium">
                {t('orgs.created')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {CONSOLE_ORGS.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-text-muted px-4 py-6 text-center">
                  {t('orgs.empty')}
                </td>
              </tr>
            ) : (
              CONSOLE_ORGS.map((org) => (
                <tr key={org.id}>
                  <td className="px-4 py-3 font-medium">{org.name}</td>
                  <td className="text-text-muted px-4 py-3">{org.plan}</td>
                  <td className="tabular px-4 py-3 text-right">{org.seats}</td>
                  <td className="px-4 py-3">
                    <Badge
                      tone={
                        org.status === 'suspended'
                          ? 'danger'
                          : org.status === 'trial'
                            ? 'warning'
                            : 'success'
                      }
                    >
                      {t(`status.${org.status}`)}
                    </Badge>
                  </td>
                  <td className="text-text-muted tabular px-4 py-3">{org.created}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
