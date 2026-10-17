import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { THEME_OPTIONS, useTheme } from '@swams/ui';
import { persistLanguage } from '../../../lib/persistPreferences.js';
import { RolesMatrix } from '../components/RolesMatrix.jsx';

const LANGUAGE_OPTIONS = ['en', 'ne'];

/**
 * `/settings` — appearance + language + the read-only roles reference.
 * Choices are device-local first (localStorage / the running i18n instance)
 * and then PATCHed to the profile; the status line reports honestly when only
 * the device copy could be saved. The matrix is a reference: changing role
 * assignments needs a roles API that is not published yet, so the table stays
 * non-interactive rather than pretending to save. Policies and the geofence
 * editor arrive with their contract rows — nothing here pretends.
 *
 * Route-guarded by `settings.manage` (nav config), which is a usability gate,
 * never the security boundary (§4.1): the API re-checks every preference write.
 */
export function SettingsPage() {
  const { t, i18n } = useTranslation('settings');
  const { t: tCommon } = useTranslation();
  const { preference, setTheme } = useTheme();
  const [appearanceStatus, setAppearanceStatus] = useState(null);
  const [languageStatus, setLanguageStatus] = useState(null);

  const chooseTheme = async (option) => {
    const result = await setTheme(option);
    setAppearanceStatus(result === false ? 'failed' : 'saved');
  };

  const chooseLanguage = async (option) => {
    i18n.changeLanguage(option);
    try {
      window.localStorage.setItem('swams.language', option);
    } catch {
      /* private mode: in-memory only */
    }
    const saved = await persistLanguage(option);
    setLanguageStatus(saved ? 'saved' : 'failed');
  };

  const currentLanguage = (i18n.language ?? 'en').split('-')[0];

  const statusLine = (status, savedText, failedText) =>
    status ? (
      <p
        role="status"
        className={`text-sm ${status === 'saved' ? 'text-success-text' : 'text-danger-text'}`}
      >
        {status === 'saved' ? savedText : failedText}
      </p>
    ) : null;

  const radioRow = (checked) =>
    `flex cursor-pointer items-center gap-3 rounded-input border px-4 py-3 text-sm transition-colors duration-feedback ease-standard focus-within:ring-2 focus-within:ring-primary ${
      checked
        ? 'border-primary bg-primary-soft'
        : 'border-border bg-surface hover:bg-surface-sunken'
    }`;

  return (
    <div className="mx-auto grid max-w-page gap-6">
      <header className="grid gap-1">
        <h1 className="text-xl">{t('title')}</h1>
        <p className="text-text-muted text-sm">{t('subtitle')}</p>
      </header>

      <section
        aria-labelledby="settings-appearance-heading"
        className="border-border bg-surface grid gap-4 rounded-card border p-5"
      >
        <div className="grid gap-1">
          <h2 id="settings-appearance-heading" className="text-md">
            {t('appearance.title')}
          </h2>
          <p className="text-text-muted text-sm">{t('appearance.hint')}</p>
        </div>

        <fieldset className="m-0 grid gap-2 border-0 p-0">
          <legend className="sr-only">{t('appearance.title')}</legend>
          {THEME_OPTIONS.map((option) => (
            <label key={option} className={radioRow(preference === option)}>
              <input
                type="radio"
                name="settings-theme"
                value={option}
                checked={preference === option}
                onChange={() => chooseTheme(option)}
                className="accent-primary h-4 w-4"
              />
              <span>{tCommon(`theme.${option}`)}</span>
            </label>
          ))}
        </fieldset>

        {statusLine(appearanceStatus, t('saved'), t('saveFailed'))}
      </section>

      <section
        aria-labelledby="settings-language-heading"
        className="border-border bg-surface grid gap-4 rounded-card border p-5"
      >
        <div className="grid gap-1">
          <h2 id="settings-language-heading" className="text-md">
            {t('language.title')}
          </h2>
          <p className="text-text-muted text-sm">{t('language.hint')}</p>
        </div>

        <fieldset className="m-0 grid gap-2 border-0 p-0">
          <legend className="sr-only">{t('language.title')}</legend>
          {LANGUAGE_OPTIONS.map((option) => (
            <label key={option} className={radioRow(currentLanguage === option)}>
              <input
                type="radio"
                name="settings-language"
                value={option}
                checked={currentLanguage === option}
                onChange={() => chooseLanguage(option)}
                className="accent-primary h-4 w-4"
              />
              <span>{t(`language.${option}`)}</span>
            </label>
          ))}
        </fieldset>

        {statusLine(languageStatus, t('saved'), t('saveFailed'))}
      </section>

      <RolesMatrix />
    </div>
  );
}
