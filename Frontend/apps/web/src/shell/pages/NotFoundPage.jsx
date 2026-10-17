import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@swams/ui';

/** 404 — invites the next action instead of dead-ending (Section 8.1). */
export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-reading flex-col items-start justify-center gap-4 p-6">
      <h1 className="text-xl">{t('notFound.title')}</h1>
      <p className="text-text-muted">{t('notFound.body')}</p>
      <Link to="/dashboard">
        <Button>{t('notFound.back')}</Button>
      </Link>
    </main>
  );
}
