import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@swams/ui';

/**
 * Designed denial page (Section 4.1): says who can grant access — never blank.
 */
export function NoAccessPage() {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-reading flex-col items-start justify-center gap-4 p-6">
      <h1 className="text-xl">{t('access.title')}</h1>
      <p className="text-text-muted">{t('access.body')}</p>
      {location.state?.from ? (
        <p className="text-text-faint text-sm">{location.state.from}</p>
      ) : null}
      <Link to="/dashboard">
        <Button variant="secondary">{t('access.back')}</Button>
      </Link>
    </main>
  );
}
