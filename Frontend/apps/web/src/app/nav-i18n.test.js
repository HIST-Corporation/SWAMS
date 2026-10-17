import { describe, it, expect } from 'vitest';
import { NAV_ITEMS } from './nav.config.js';
import { resources, initI18n } from '@swams/i18n';

initI18n();

/** Every nav labelKey must resolve in BOTH locales (Section 8.10, DoD). */
describe('nav.config i18n coverage', () => {
  const keys = [
    ...NAV_ITEMS.map((item) => item.labelKey),
    ...NAV_ITEMS.map((item) => `nav.${item.group}`),
    'nav.upgradeHint',
    'nav.skipToContent',
    'nav.yourAccount',
  ].filter((key) => key !== 'nav.null');

  for (const lng of ['en', 'ne']) {
    describe(lng, () => {
      for (const key of [...new Set(keys)]) {
        it(`resolves ${key}`, () => {
          const translated = resources[lng].nav[key] ?? resources[lng].nav?.[key];
          // i18next resolves nested keys against the namespace object directly here.
          const value =
            translated ??
            key.split('.').reduce((acc, part) => (acc ? acc[part] : undefined), resources[lng].nav);
          expect(value, `${lng}:${key} missing`).toBeTruthy();
          expect(value).not.toBe(key);
        });
      }
    });
  }
});
