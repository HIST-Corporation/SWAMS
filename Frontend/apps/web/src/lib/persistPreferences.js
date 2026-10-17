import { api } from './apiClient.js';

/**
 * Persist a preference to the profile (Section 8.3: theme is stored in
 * localStorage immediately and PATCHed to /me/preferences when signed in).
 * The local copy always wins; failures resolve `false` instead of throwing so
 * a caller (Settings) can say the choice is kept on this device only.
 * @param {'light'|'dark'|'system'} theme
 * @returns {Promise<boolean>} true when the profile accepted the change
 */
export function persistTheme(theme) {
  return api
    .patch('/me/preferences', { theme })
    .then(() => true)
    .catch(() => false);
}

/**
 * Persist the interface language to the profile (same contract as
 * `persistTheme`; the caller already stores `swams.language` locally).
 * @param {'en'|'ne'} language
 * @returns {Promise<boolean>} true when the profile accepted the change
 */
export function persistLanguage(language) {
  return api
    .patch('/me/preferences', { language })
    .then(() => true)
    .catch(() => false);
}
