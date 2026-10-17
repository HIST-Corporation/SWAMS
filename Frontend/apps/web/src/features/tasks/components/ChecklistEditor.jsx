import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Checkbox, cn } from '@swams/ui';
import { CONTROL } from './DialogField.jsx';
import { useChecklist } from '../hooks/useTasks.js';

/**
 * The to-do list inside a task (contract request 22). Items have stable ids,
 * so a tick always names the item it belongs to; the count is derived from the
 * items themselves and never stored twice.
 *
 * Ticking is immediate (small, frequent, reversible — the card's progress and
 * this list are one optimistic write). Adding and removing wait for the server
 * because the new item's id comes back from it. Nothing here cascades: all
 * boxes ticked does NOT move the task to Done — that stays a deliberate drag,
 * keyboard drop or lane change, exactly like the prototype's board.
 *
 * @param {{ task: object, onError: (message: string) => void }} props
 */
export function ChecklistEditor({ task, onError }) {
  const { t } = useTranslation('tasks');
  const [text, setText] = useState('');
  const checklist = useChecklist({ onError: (error) => onError(error.message) });

  const items = task.checklist ?? [];
  const doneCount = items.filter((item) => item.done).length;
  const busy = checklist.add.isPending || checklist.toggle.isPending || checklist.remove.isPending;

  const add = () => {
    const value = text.trim();
    if (!value || busy) return;
    checklist.add.mutate({ id: task.id, text: value }, { onSuccess: () => setText('') });
  };

  return (
    <section aria-labelledby="checklist-heading" className="grid gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h3 id="checklist-heading" className="text-sm font-semibold">
          {t('checklist.title')}
        </h3>
        {items.length > 0 ? (
          <p className="text-text-faint text-xs">
            {t('checklist.progress', { done: doneCount, total: items.length })}
          </p>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="text-text-faint text-sm">{t('checklist.empty')}</p>
      ) : (
        <ul className="grid gap-1">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <label className="flex min-h-9 min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  aria-label={item.text}
                  checked={item.done}
                  onCheckedChange={(next) =>
                    checklist.toggle.mutate({ id: task.id, itemId: item.id, done: Boolean(next) })
                  }
                />
                <span className={item.done ? 'text-text-faint line-through' : ''}>{item.text}</span>
              </label>
              <button
                type="button"
                aria-label={t('checklist.remove', { text: item.text })}
                onClick={() => checklist.remove.mutate({ id: task.id, itemId: item.id })}
                className="text-text-faint hover:text-danger-text focus-visible:ring-primary inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-input focus-visible:outline-none focus-visible:ring-2"
              >
                <Trash2 aria-hidden="true" size={14} strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          value={text}
          aria-label={t('checklist.addPlaceholder')}
          placeholder={t('checklist.addPlaceholder')}
          maxLength={140}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              add();
            }
          }}
          className={cn(CONTROL, 'min-w-0')}
        />
        <button
          type="button"
          onClick={add}
          disabled={!text.trim() || busy}
          className="border-border bg-surface-sunken text-text hover:bg-surface focus-visible:ring-primary rounded-input h-11 shrink-0 border px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 disabled:opacity-55"
        >
          {t('checklist.add')}
        </button>
      </div>
    </section>
  );
}
