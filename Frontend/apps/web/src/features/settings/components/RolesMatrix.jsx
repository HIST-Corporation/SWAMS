import { Check, Minus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PERMISSIONS, ROLES, ROLE_BUNDLES } from '@swams/permissions';

/**
 * RolesMatrix — the workspace's default role reference (slice 6, read-only).
 *
 * Rows come from the canonical `PERMISSIONS` list grouped by area; a check
 * marks a grant in `ROLE_BUNDLES`, a dash marks its absence. Both states carry
 * visible text (`roles.granted` / `roles.denied`) plus icons, never colour
 * alone (§8.9). Changing assignments needs a roles API (contract request:
 * none published) — until it exists, every control here stays non-interactive
 * rather than pretending to save.
 */
export function RolesMatrix() {
  const { t } = useTranslation('settings');

  const groups = [];
  const seen = new Set();
  for (const permission of PERMISSIONS) {
    const area = permission.split('.')[0];
    if (!seen.has(area)) {
      seen.add(area);
      groups.push({ area, permissions: PERMISSIONS.filter((key) => key.startsWith(`${area}.`)) });
    }
  }

  return (
    <section
      aria-labelledby="settings-roles-heading"
      className="border-border bg-surface grid gap-4 rounded-card border p-5"
    >
      <div className="grid gap-1">
        <h2 id="settings-roles-heading" className="text-md">
          {t('roles.title')}
        </h2>
        <p className="text-text-muted text-sm">{t('roles.hint')}</p>
      </div>

      {groups.map((group) => (
        <div key={group.area} className="grid gap-2">
          <h3 className="text-text-muted text-xs font-semibold uppercase tracking-wide">
            {t(`roles.group.${group.area}`)}
          </h3>
          <div className="border-border overflow-x-auto rounded-input border">
            <table className="w-full min-w-[28rem] border-collapse text-sm">
              <caption className="sr-only">{t(`roles.group.${group.area}`)}</caption>
              <thead>
                <tr className="border-border bg-surface-sunken border-b">
                  <th scope="col" className="px-4 py-2.5 text-left font-medium">
                    {t('roles.permission')}
                  </th>
                  {ROLES.map((role) => (
                    <th
                      key={role}
                      scope="col"
                      className="min-w-16 px-3 py-2.5 text-center font-medium"
                    >
                      {t(`roles.role.${role}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {group.permissions.map((permission) => (
                  <tr key={permission} className="border-border border-b last:border-0">
                    <th scope="row" className="px-4 py-2.5 text-left font-normal">
                      {t(`roles.description.${permission}`)}
                    </th>
                    {ROLES.map((role) => {
                      const granted = ROLE_BUNDLES[role]?.includes(permission) ?? false;
                      return (
                        <td key={role} className="px-3 py-2.5 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-pill px-2 py-0.5 text-xs font-medium ${
                              granted
                                ? 'bg-success-soft text-success-text'
                                : 'bg-surface-sunken text-text-faint'
                            }`}
                          >
                            {granted ? (
                              <Check aria-hidden="true" size={12} strokeWidth={2.5} />
                            ) : (
                              <Minus aria-hidden="true" size={12} strokeWidth={2.5} />
                            )}
                            {t(granted ? 'roles.granted' : 'roles.denied')}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <p className="text-text-faint text-xs">{t('roles.note')}</p>
    </section>
  );
}
