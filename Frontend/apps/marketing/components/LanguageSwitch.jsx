'use client';

import { useEffect } from 'react';
import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { initI18n } from '@swams/i18n';

// One shared i18next instance for the static export (same catalogs as the app).
initI18n();

/**
 * Language switch (Section 13: en + ne). The static export is prerendered in
 * English, so the stored choice is applied after hydration — the same storage
 * key the app uses, so one visitor's choice follows them across both sites.
 */
export function LanguageSwitch() {
  const { t, i18n } = useTranslation();
  const language = i18n.language === 'ne' ? 'ne' : 'en';

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('swams.language');
      if (stored === 'en' || stored === 'ne') {
        document.documentElement.lang = stored;
        if (i18n.language !== stored) i18n.changeLanguage(stored);
      }
    } catch {
      /* private mode: in-memory only */
    }
  }, [i18n]);

  const toggle = () => {
    const next = language === 'ne' ? 'en' : 'ne';
    i18n.changeLanguage(next);
    document.documentElement.lang = next;
    try {
      window.localStorage.setItem('swams.language', next);
    } catch {
      /* private mode: in-memory only */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={language === 'ne'}
      aria-label={t('language.switch')}
      className="inline-flex h-11 items-center gap-2 rounded-button border border-border bg-surface px-3 text-sm font-medium text-text transition-colors duration-feedback ease-standard hover:bg-surface-sunken"
    >
      <Languages aria-hidden="true" size={16} strokeWidth={1.75} />
      {t(`language.${language}`, { ns: 'marketing' })}
    </button>
  );
}
