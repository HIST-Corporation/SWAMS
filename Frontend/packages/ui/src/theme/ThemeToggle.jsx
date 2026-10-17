'use client';

import { Check, Monitor, Moon, Sun } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useTranslation } from 'react-i18next';
import { useTheme } from './ThemeProvider.jsx';

const ICONS = { light: Sun, dark: Moon, system: Monitor };
/**
 * Light / Dark / System switcher (Section 8.3): icon button + menu, keyboard
 * accessible through Radix, labels through i18n, state through useTheme.
 */
export function ThemeToggle({ className, ...props }) {
  const { t } = useTranslation();
  const { preference, setTheme } = useTheme();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={
          className ??
          'inline-flex h-11 w-11 items-center justify-center rounded-button border border-border bg-surface text-text transition-colors duration-feedback ease-standard hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
        }
        aria-label={t('theme.label')}
        {...props}
      >
        {/* Both icons are static JSX, so server and client render the same
            tree; which one shows is decided purely by CSS from data-theme on
            <html> (set pre-paint by the inline theme script). Choosing the
            icon from `resolved` read localStorage during the first client
            render, so anyone outside default light got sun-on-server vs
            moon-on-client — a hydration mismatch that regenerated the root
            tree client-side (also tripping React's script-tag warning). */}
        <Sun className="dark:hidden" aria-hidden="true" size={18} strokeWidth={1.75} />
        <Moon className="hidden dark:inline-flex" aria-hidden="true" size={18} strokeWidth={1.75} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={8}
          className="z-dropdown min-w-40 rounded-card border border-border bg-surface-raised p-1 shadow-2"
        >
          <DropdownMenu.RadioGroup value={preference} onValueChange={setTheme}>
            {THEME_ITEMS.map((option) => {
              const Icon = ICONS[option];
              return (
                <DropdownMenu.RadioItem
                  key={option}
                  value={option}
                  className="flex cursor-pointer select-none items-center gap-2 rounded-input px-3 py-2 text-sm text-text outline-none data-[highlighted]:bg-primary-soft"
                >
                  <Icon aria-hidden="true" size={16} strokeWidth={1.75} />
                  <span className="flex-1">{t(`theme.${option}`)}</span>
                  <DropdownMenu.ItemIndicator>
                    <Check aria-hidden="true" size={14} strokeWidth={2} />
                  </DropdownMenu.ItemIndicator>
                </DropdownMenu.RadioItem>
              );
            })}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

const THEME_ITEMS = ['light', 'dark', 'system'];
