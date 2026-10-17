import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar, EmptyState, PreviewNotice } from '@swams/ui';
import { DEPARTMENTS, TEAM_MEMBERS } from '../mocks/fixtures.js';

/** Presence dot — the label beside it carries the meaning (§8.9). */
const DOT = {
  online: 'bg-success',
  busy: 'bg-danger',
  away: 'bg-warning',
  offline: 'bg-text-muted/60',
};

/**
 * `/team` — live availability and task load (screen inventory, R1 directory /
 * R2 live board). SAMPLE DATA: the `GET /team` + `GET /presence` contract is
 * still open, so the page says so up front instead of posing as live (§12.1).
 */
export function TeamPage() {
  const { t } = useTranslation('team');
  const { t: tn } = useTranslation('nav');
  const [dept, setDept] = useState('all');
  const members =
    dept === 'all' ? TEAM_MEMBERS : TEAM_MEMBERS.filter((member) => member.dept === dept);

  return (
    <div className="mx-auto grid max-w-page gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl">{tn('team')}</h1>
          <p className="text-text-muted mt-1 text-sm">{t('subtitle')}</p>
        </div>
        <label className="grid gap-1">
          <span className="sr-only">{t('filterLabel')}</span>
          <select
            className="border-border bg-surface-sunken focus:border-primary rounded-input border px-3 py-2 text-sm outline-none"
            value={dept}
            onChange={(event) => setDept(event.target.value)}
          >
            <option value="all">{t('allDepartments')}</option>
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {t(`departments.${dept}`)}
              </option>
            ))}
          </select>
        </label>
      </header>

      <PreviewNotice />

      {members.length === 0 ? <EmptyState title={t('emptyTitle')} body={t('emptyBody')} /> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {members.map((member) => (
          <article key={member.id} className="border-border bg-surface rounded-card border p-5">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar name={member.name} />
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface ${DOT[member.status]}`}
                />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-medium">{member.name}</h2>
                <p className="text-text-muted text-sm">{t(`roles.${member.roleKey}`)}</p>
                <p className="text-text-muted mt-1 text-xs">
                  {t('meta', {
                    status: t(`status.${member.status}`),
                    dept: t(`departments.${member.dept}`),
                  })}
                </p>
              </div>
            </div>
            <div className="text-text-muted mt-4 flex items-center justify-between text-sm">
              <span>{t('openTasks')}</span>
              <span className="tabular font-medium">{member.tasks}</span>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
