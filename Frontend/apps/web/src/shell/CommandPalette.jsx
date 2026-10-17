import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { CommandPalette } from '@swams/ui';
import { NAV_ITEMS } from '../app/nav.config.js';
import { navState } from '../app/nav-access.js';
import { useSession } from '../hooks/useSession.js';
import { useUiStore } from '../stores/ui.js';

/**
 * Command palette wired to the nav config (Section 8.5): only sections the user
 * can actually open appear, grouped like the sidebar. Opens with ⌘K / Ctrl+K
 * or from the topbar search button.
 */
export function AppCommandPalette() {
  const open = useUiStore((state) => state.paletteOpen);
  const setOpen = useUiStore((state) => state.setPaletteOpen);
  const togglePalette = useUiStore((state) => state.togglePalette);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { t: tNav } = useTranslation('nav');
  const { principal, entitlements } = useSession();

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        togglePalette();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [togglePalette]);

  const groups = useMemo(() => {
    const byGroup = new Map();
    for (const item of NAV_ITEMS) {
      if (!item.group) continue;
      if (navState(item, principal, entitlements) !== 'allowed') continue;
      if (!byGroup.has(item.group)) {
        byGroup.set(item.group, {
          id: item.group,
          label: tNav(`nav.${item.group}`),
          items: [],
        });
      }
      byGroup
        .get(item.group)
        .items.push({ id: item.id, label: tNav(item.labelKey), path: item.path });
    }
    return [...byGroup.values()];
  }, [principal, entitlements, tNav]);

  return (
    <CommandPalette
      open={open}
      onOpenChange={setOpen}
      groups={groups}
      onSelect={(item) => navigate(item.path)}
      title={t('palette.open')}
      placeholder={t('palette.placeholder')}
      emptyLabel={t('palette.empty')}
      hintLabel={t('palette.hint')}
    />
  );
}
