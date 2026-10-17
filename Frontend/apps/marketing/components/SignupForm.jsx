'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { initI18n } from '@swams/i18n';
import { DEMO_URL } from '../lib/env.js';

// One shared i18next instance for the static export (same catalogs as the app).
initI18n();

/**
 * Inline sign-up form (GitHub-homepage pattern, SWAMS branding): an email
 * field and a single action that opens the demo sign-in page at its own URL
 * in a new tab so the landing page stays open. There is no backend on the
 * landing (§7.7) — submitting hands the visitor to the session machine, which
 * autofills the selected role's demo account (§12.1: the demo is never passed
 * off as the live product).
 *
 * Used by both the hero and the closing CTA, so the id prefix keeps the
 * label's `htmlFor` unique when both render on one page.
 */
export function SignupForm({ size = 'md', idPrefix = 'signup' }) {
  const { t } = useTranslation('marketing');
  const [email, setEmail] = useState('');

  const emailId = `${idPrefix}-email`;

  return (
    <form
      action={DEMO_URL}
      method="get"
      target="_blank"
      rel="noopener noreferrer"
      onSubmit={(event) => {
        event.preventDefault();
        window.open(DEMO_URL, '_blank', 'noopener,noreferrer');
      }}
      className="flex w-full max-w-md flex-col gap-2 sm:flex-row"
      noValidate
    >
      <label htmlFor={emailId} className="sr-only">
        {t('hero.emailLabel')}
      </label>
      <input
        id={emailId}
        type="email"
        name="email"
        autoComplete="email"
        inputMode="email"
        placeholder={t('hero.emailPlaceholder')}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className={`h-11 flex-1 rounded-button border border-border bg-surface px-3 text-base text-text placeholder:text-text-faint focus:border-primary focus:outline-none ${
          size === 'lg' ? 'md:h-12 md:text-md' : ''
        }`}
      />
      <button
        type="submit"
        className={`mk-btn mk-btn--primary shrink-0 whitespace-nowrap ${size === 'lg' ? 'md:h-12' : ''}`}
      >
        {t('hero.signup')}
        <ArrowRight aria-hidden="true" size={16} strokeWidth={1.75} />
      </button>
    </form>
  );
}
