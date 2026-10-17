import { useTranslation } from 'react-i18next';
import { Badge, Card, CardTitle } from '@swams/ui';
import { CONSOLE_ADMINS } from '../data/fixtures.js';

/**
 * Admin accounts — the platform administration roster (contract request 31:
 * `GET /platform/admins`). Development fixtures.
 */
export function AccountsSection() {
  const { t } = useTranslation('console');

  return (
    <Card aria-labelledby="accounts-heading">
      <CardTitle id="accounts-heading">{t('accounts.title')}</CardTitle>
      <div className="border-border overflow-x-auto rounded-card border">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="border-border bg-surface-sunken border-b text-xs">
              <th scope="col" className="text-text-faint px-4 py-2.5 font-medium">
                {t('accounts.name')}
              </th>
              <th scope="col" className="text-text-faint px-4 py-2.5 font-medium">
                {t('accounts.email')}
              </th>
              <th scope="col" className="text-text-faint px-4 py-2.5 font-medium">
                {t('accounts.level')}
              </th>
              <th scope="col" className="text-text-faint px-4 py-2.5 font-medium">
                {t('accounts.last')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {CONSOLE_ADMINS.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-text-muted px-4 py-6 text-center">
                  {t('accounts.empty')}
                </td>
              </tr>
            ) : (
              CONSOLE_ADMINS.map((admin) => (
                <tr key={admin.id}>
                  <td className="px-4 py-3 font-medium">{admin.name}</td>
                  <td className="text-text-muted px-4 py-3">{admin.email}</td>
                  <td className="px-4 py-3">
                    <Badge tone={admin.level === 'owner' ? 'primary' : 'neutral'}>
                      {t(`level.${admin.level}`)}
                    </Badge>
                  </td>
                  <td className="text-text-muted tabular px-4 py-3">{admin.lastSeen}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
