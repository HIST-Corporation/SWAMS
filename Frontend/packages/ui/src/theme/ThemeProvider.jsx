'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import tokens from '@swams/design-tokens/tokens.json';

export const THEME_STORAGE_KEY = 'swams.theme';
export const THEME_OPTIONS = ['light', 'dark', 'system'];

const ThemeContext = createContext(null);

const hasWindow = typeof window !== 'undefined';

/** @returns {'light'|'dark'|'system'} */
export function readStoredTheme() {
  if (!hasWindow) return 'system';
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return THEME_OPTIONS.includes(value) ? value : 'system';
  } catch {
    return 'system';
  }
}

function systemPrefersDark() {
  return hasWindow && window.matchMedia?.('(prefers-color-scheme: dark)').matches === true;
}

/**
 * Apply the resolved theme to the document (Section 8.3): data-theme drives the
 * token swap, color-scheme drives native controls/scrollbars, theme-color matches.
 * @param {'light'|'dark'} resolved
 */
export function applyTheme(resolved) {
  if (!hasWindow) return;
  const root = document.documentElement;
  root.setAttribute('data-theme', resolved);
  root.style.colorScheme = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', tokens.color.bg[resolved]);
}

/**
 * @param {{ children: React.ReactNode, onPersist?: (theme: 'light'|'dark'|'system') => void }} props
 */
export function ThemeProvider({ children, onPersist }) {
  const [preference, setPreference] = useState(readStoredTheme);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  const resolved = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;

  // 1. Apply on every change.
  useEffect(() => {
    applyTheme(resolved);
  }, [resolved]);

  // 2. Persist immediately to localStorage + notify the app (PATCH /me/preferences).
  //    Returns the onPersist result (a promise when the app persists to the
  //    profile) so a Settings screen can report save failures honestly.
  const setTheme = useCallback(
    (next) => {
      if (!THEME_OPTIONS.includes(next)) return undefined;
      setPreference(next);
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        /* private mode: in-memory only */
      }
      return onPersist?.(next);
    },
    [onPersist],
  );

  // 3. Multi-tab sync (storage event).
  useEffect(() => {
    if (!hasWindow) return undefined;
    const onStorage = (event) => {
      if (event.key === THEME_STORAGE_KEY && THEME_OPTIONS.includes(event.newValue)) {
        setPreference(event.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // 4. OS theme changes while on System.
  useEffect(() => {
    if (!hasWindow) return undefined;
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return undefined;
    const onChange = (event) => setSystemDark(event.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const value = useMemo(
    () => ({ preference, resolved, setTheme, options: THEME_OPTIONS }),
    [preference, resolved, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * @returns {{ preference: 'light'|'dark'|'system', resolved: 'light'|'dark', setTheme: (t: 'light'|'dark'|'system') => void }}
 */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
