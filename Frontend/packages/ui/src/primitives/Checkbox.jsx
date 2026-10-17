import * as RadixCheckbox from '@radix-ui/react-checkbox';
import { Check, Minus } from 'lucide-react';
import { forwardRef } from 'react';
import { cn } from '../utils/cn.js';

/**
 * Checkbox (Radix): supports checked / unchecked / indeterminate, keyboard and
 * form use. Label + description belong in FormField.
 */
export const Checkbox = forwardRef(function Checkbox({ className, ...props }, ref) {
  return (
    <RadixCheckbox.Root
      ref={ref}
      className={cn(
        'border-border bg-surface flex h-5 w-5 shrink-0 items-center justify-center rounded-input border transition-colors duration-feedback ease-standard',
        'hover:border-text-faint focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-2',
        'data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-on-primary',
        'data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-on-primary',
        'disabled:pointer-events-none disabled:opacity-55',
        props.invalid &&
          'border-danger data-[state=checked]:border-danger data-[state=checked]:bg-danger',
        className,
      )}
      {...props}
    >
      <RadixCheckbox.Indicator className="flex items-center justify-center">
        {props.checked === 'indeterminate' ? (
          <Minus aria-hidden="true" size={13} strokeWidth={2.5} />
        ) : (
          <Check aria-hidden="true" size={13} strokeWidth={2.5} />
        )}
      </RadixCheckbox.Indicator>
    </RadixCheckbox.Root>
  );
});
