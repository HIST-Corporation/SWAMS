import * as RadixSwitch from '@radix-ui/react-switch';
import { forwardRef } from 'react';
import { cn } from '../utils/cn.js';

/** Switch (Radix): on/off with a 44px-equivalent hit area. */
export const Switch = forwardRef(function Switch({ className, ...props }, ref) {
  return (
    <RadixSwitch.Root
      ref={ref}
      className={cn(
        'border-border bg-surface-sunken relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-pill border transition-colors duration-feedback ease-standard',
        'focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-2',
        'data-[state=checked]:border-primary data-[state=checked]:bg-primary',
        'disabled:pointer-events-none disabled:opacity-55',
        className,
      )}
      {...props}
    >
      <RadixSwitch.Thumb className="bg-surface-raised block h-4 w-4 translate-x-1 rounded-pill shadow-1 transition-transform duration-feedback ease-standard data-[state=checked]:translate-x-6" />
    </RadixSwitch.Root>
  );
});
