'use client';

import * as RadixToast from '@radix-ui/react-toast';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { cn } from '../utils/cn.js';

const ToastContext = createContext(null);

const VARIANT_STYLES = {
  info: 'bg-surface-raised text-text border-border',
  success: 'bg-surface-raised text-text border-success',
  danger: 'bg-surface-raised text-text border-danger',
};

/**
 * Toast system (Section 8.7): one viewport, announced through a polite live
 * region, swipe/Escape dismissible, optional one-tap action (e.g. undo, 7.10).
 * Messages come translated from the caller — this component renders text only.
 *
 * @example const { toast } = useToast();
 *   toast({ title: 'Request sent', description: 'Sita will review it', action: { label: 'Undo', onAction: undo } });
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(({ title, description, variant = 'info', duration = 5000, action }) => {
    idRef.current += 1;
    const id = idRef.current;
    setToasts((list) => [...list, { id, title, description, variant, duration, action }]);
    return id;
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      <RadixToast.Provider swipeDirection="right" duration={5000}>
        {children}
        {toasts.map(({ id, title, description, variant, duration, action }) => (
          <RadixToast.Root
            key={id}
            duration={duration}
            onOpenChange={(open) => {
              if (!open) dismiss(id);
            }}
            className={cn(
              'border z-toast rounded-card border p-4 shadow-2',
              'data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]',
              'data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=end]:opacity-0',
              VARIANT_STYLES[variant] ?? VARIANT_STYLES.info,
            )}
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <RadixToast.Title className="text-sm font-medium">{title}</RadixToast.Title>
                {description ? (
                  <RadixToast.Description className="text-text-muted mt-0.5 text-sm">
                    {description}
                  </RadixToast.Description>
                ) : null}
              </div>
              {action ? (
                <RadixToast.Action
                  asChild
                  altText={action.altText ?? action.label}
                  onClick={() => {
                    action.onAction?.();
                    dismiss(id);
                  }}
                >
                  <button
                    type="button"
                    className="text-primary hover:bg-primary-soft shrink-0 rounded-input px-2 py-1 text-sm font-medium"
                  >
                    {action.label}
                  </button>
                </RadixToast.Action>
              ) : (
                <RadixToast.Close
                  aria-label="Dismiss"
                  className="text-text-faint hover:text-text shrink-0 rounded-input px-1"
                >
                  ×
                </RadixToast.Close>
              )}
            </div>
          </RadixToast.Root>
        ))}
        <RadixToast.Viewport className="fixed inset-x-4 bottom-4 z-toast mx-auto flex w-full max-w-[380px] flex-col gap-2 md:inset-x-auto md:right-6 md:bottom-6" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}

/** @returns {{ toast: (input: object) => number, dismiss: (id: number) => void }} */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
