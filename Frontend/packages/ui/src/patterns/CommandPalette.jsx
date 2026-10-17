'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../utils/cn.js';

/**
 * Command palette (Section 8.7): config-driven cross-screen navigation.
 * Keyboard-first: type to filter, ArrowUp/Down to move, Enter to open, Esc to
 * close. Listbox semantics with aria-activedescendant (Section 8.9).
 *
 * @param {{
 *   open: boolean,
 *   onOpenChange: (open: boolean) => void,
 *   groups: Array<{ id: string, label: string, items: Array<{ id: string, label: string, hint?: string }> }>,
 *   onSelect: (item: object) => void,
 *   title: string, placeholder: string, emptyLabel: string, hintLabel: string,
 *   initialQuery?: string,
 * }} props
 */
export function CommandPalette({
  open,
  onOpenChange,
  groups,
  onSelect,
  title,
  placeholder,
  emptyLabel,
  hintLabel,
  initialQuery = '',
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="z-modal bg-overlay fixed inset-0" />
        {open ? (
          // Remounting on open resets filter/active state without effects.
          <PaletteBody
            groups={groups}
            onSelect={onSelect}
            onOpenChange={onOpenChange}
            title={title}
            placeholder={placeholder}
            emptyLabel={emptyLabel}
            hintLabel={hintLabel}
            initialQuery={initialQuery}
          />
        ) : null}
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function PaletteBody({
  groups,
  onSelect,
  onOpenChange,
  title,
  placeholder,
  emptyLabel,
  hintLabel,
  initialQuery,
}) {
  const [query, setQuery] = useState(initialQuery);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef(null);

  const flat = useMemo(
    () =>
      groups.flatMap((group) =>
        group.items
          .filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase()))
          .map((item) => ({ ...item, groupLabel: group.label })),
      ),
    [groups, query],
  );

  useEffect(() => {
    const active = listRef.current?.querySelector('[data-active="true"]');
    active?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const select = (item) => {
    onOpenChange(false);
    onSelect(item);
  };

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flat.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter' && flat[activeIndex]) {
      event.preventDefault();
      select(flat[activeIndex]);
    }
  };

  return (
    <Dialog.Content
      className="bg-surface-raised border-border shadow-2 fixed left-1/2 top-[12vh] z-modal w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 rounded-sheet border p-2"
      onKeyDown={onKeyDown}
    >
      <Dialog.Title className="sr-only">{title}</Dialog.Title>
      <Dialog.Description className="sr-only">{hintLabel}</Dialog.Description>
      <div className="border-border flex items-center gap-2 border-b px-3 pb-2">
        <Search aria-hidden="true" size={16} strokeWidth={1.75} className="text-text-faint" />
        <input
          role="combobox"
          aria-expanded="true"
          aria-controls="swams-palette-list"
          aria-activedescendant={
            flat[activeIndex] ? `swams-palette-option-${activeIndex}` : undefined
          }
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          className="text-text placeholder:text-text-faint h-12 w-full bg-transparent text-base outline-none"
        />
      </div>

      <ul
        id="swams-palette-list"
        role="listbox"
        aria-label={title}
        ref={listRef}
        className="max-h-[46vh] overflow-y-auto p-1"
      >
        {flat.length === 0 ? (
          <li className="text-text-faint px-3 py-8 text-center text-sm">{emptyLabel}</li>
        ) : (
          flat.map((item, index) => (
            <li
              key={item.id}
              id={`swams-palette-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              data-active={index === activeIndex || undefined}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => select(item)}
              // Enter/Space on the input already selects; mirrored here for completeness.
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') select(item);
              }}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-input px-3 py-2.5 text-sm',
                index === activeIndex ? 'bg-primary-soft text-primary' : 'text-text',
              )}
            >
              <span className="flex-1 truncate">{item.label}</span>
              <span className="text-text-faint shrink-0 text-xs">{item.groupLabel}</span>
            </li>
          ))
        )}
      </ul>
    </Dialog.Content>
  );
}
