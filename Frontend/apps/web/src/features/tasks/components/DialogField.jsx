/**
 * One labelled control of the task detail panel. The label wraps the control,
 * so the visible word IS the accessible name — no `htmlFor`/`id` pairs to keep
 * in step, and every control is 44px tall regardless of text size.
 *
 * @param {{ label: string, hint?: string, children: object }} props
 */
export function Field({ label, hint, children }) {
  return (
    // `content-start` top-packs the field's own grid. Without it a field that
    // stretches to a taller sibling (a Lane beside a hint-less Priority) would
    // spread its tracks via the grid's default `align-content: stretch` and
    // shove its control down — so controls on a two-column row must share one
    // top edge no matter which neighbour carries a hint.
    <label className="grid content-start gap-1">
      <span className="text-text-muted text-xs font-medium">{label}</span>
      {children}
      {hint ? <span className="text-text-faint text-xs">{hint}</span> : null}
    </label>
  );
}

/**
 * The one control recipe every task form shares — deliberately identical to the
 * design-system `Input` (§8.7): a 44px target, 16px text (never smaller on
 * touch), `bg-surface`, a hover that names the interactive border, and a 2px
 * focus-visible ring. New task, Push back, Lane settings, the Note prompt and
 * the checklist all build on this so the dialogs read as one family. Overrides
 * (a taller textarea, a narrow WIP box) are applied through `cn`, whose
 * tailwind-merge keeps the last utility — never the stylesheet's order.
 */
export const CONTROL =
  'bg-surface border-border text-text placeholder:text-text-faint h-11 w-full rounded-input border px-3 text-base transition-colors duration-feedback ease-standard hover:border-text-faint focus-visible:border-primary focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-55';
