import { cn } from '@swams/ui';

/** Kind → dot colour; the word is always the kind's text (§8.9). */
const KIND_DOT = {
  leave: 'bg-info',
  holiday: 'bg-danger',
  meeting: 'bg-primary',
};

/** Every kind this calendar knows about. */
export const KINDS = Object.keys(KIND_DOT);

/**
 * The legend, as toggles. Each chip is a real switch (`aria-pressed`), so the
 * visitor can answer "what leave is coming up?" without leaving the month —
 * and the colour dot always sits next to the kind's word, never alone.
 *
 * @param {{ t: Function, kinds: Set<string>, onToggle: (kind: string) => void, onClear: () => void }} props
 */
export function KindFilter({ t, kinds, onToggle, onClear }) {
  const allOn = KINDS.every((kind) => kinds.has(kind));

  return (
    <div role="group" aria-label={t('legend')} className="flex flex-wrap items-center gap-2">
      {KINDS.map((kind) => {
        const on = kinds.has(kind);
        return (
          <button
            key={kind}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(kind)}
            className={cn(
              'focus-visible:ring-primary inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2',
              on
                ? 'border-border bg-surface text-text'
                : 'border-border-strong bg-surface-sunken text-text-muted',
            )}
          >
            <span aria-hidden="true" className={`h-2 w-2 rounded-pill ${KIND_DOT[kind]}`} />
            {t(`kind.${kind}`)}
          </button>
        );
      })}

      {!allOn ? (
        <button
          type="button"
          onClick={onClear}
          className="text-primary focus-visible:ring-primary rounded-pill px-1 py-1 text-xs underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2"
        >
          {t('filter.showAll')}
        </button>
      ) : null}
    </div>
  );
}
