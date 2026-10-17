import { useEffect, useRef, useState } from 'react';
import {
  Brain,
  Briefcase,
  Check,
  ChevronDown,
  Coffee,
  Plane,
  Smile,
  Target,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@swams/ui';
import { STATUS_PRESETS, usePresenceStore } from '../stores/presence.js';

/** Status-line copy lives in the nav namespace (packages/i18n, nav.json). */
const useNavT = () => useTranslation('nav').t;

/**
 * Preset id → icon. Decorative (the label always sits beside it, §8.9) — the
 * icon just gives each option a recognisable shape at a glance.
 */
const ICONS = {
  available: Smile,
  deep_work: Brain,
  in_a_meeting: Briefcase,
  on_break: Coffee,
  focusing: Target,
  on_leave: Plane,
};

/**
 * Your custom status line — the third row of the sidebar user card, under the
 * name and job title. Instead of typing free text, it's a **picklist**: click
 * the line to open a small menu of preset statuses ("In a meeting", "Deep
 * work", …) and choose one; choose "Clear status" to remove it. The line shows
 * the chosen preset (with its icon) or a "Add a status…" prompt when unset.
 *
 * Like availability it is a device preference localStorage-persisted (§5); the
 * mock server has no status-message endpoint, so nothing here is presented as
 * server state (§12.1). The menu closes on Escape and outside click.
 */
export function StatusMessageLine() {
  const t = useNavT();
  const statusMessage = usePresenceStore((state) => state.statusMessage);
  const setStatusMessage = usePresenceStore((state) => state.setStatusMessage);
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onClick = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  const ChosenIcon = ICONS[statusMessage] ?? Smile;

  return (
    <div ref={rootRef} className="relative mt-0.5">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="text-nav-label hover:text-nav-text-strong focus-visible:ring-primary flex w-full items-center gap-1 rounded text-left text-[11px] focus-visible:outline-none focus-visible:ring-2"
      >
        <ChosenIcon aria-hidden="true" size={12} strokeWidth={1.75} className="shrink-0" />
        <span className="truncate">
          {statusMessage ? t(`nav.statusMessage.presets.${statusMessage}`) : t('nav.statusMessage.placeholder')}
        </span>
        <ChevronDown
          aria-hidden="true"
          size={12}
          strokeWidth={2}
          className={cn('ml-auto shrink-0 transition-transform duration-feedback', open && 'rotate-180')}
        />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label={t('nav.statusMessage.label')}
          className="border-border bg-surface z-dropdown absolute left-0 mt-1 w-48 rounded-input border p-1 shadow-2"
        >
          {STATUS_PRESETS.map((id) => {
            const Icon = ICONS[id];
            const active = statusMessage === id;
            return (
              <button
                key={id}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setStatusMessage(id);
                  setOpen(false);
                }}
                className={cn(
                  'hover:bg-surface-sunken focus-visible:ring-primary flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[11px] focus-visible:outline-none focus-visible:ring-2',
                  active ? 'text-primary font-medium' : 'text-text-muted',
                )}
              >
                <Icon aria-hidden="true" size={13} strokeWidth={1.75} className="shrink-0" />
                <span className="flex-1 truncate">{t(`nav.statusMessage.presets.${id}`)}</span>
                {active ? <Check aria-hidden="true" size={13} strokeWidth={2.5} /> : null}
              </button>
            );
          })}

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setStatusMessage('');
              setOpen(false);
            }}
            className="border-border text-text-faint hover:text-danger focus-visible:ring-danger/40 mt-1 flex w-full items-center gap-2 rounded border-t px-2 py-1.5 text-left text-[11px] focus-visible:outline-none focus-visible:ring-2"
          >
            {t('nav.statusMessage.clear')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
