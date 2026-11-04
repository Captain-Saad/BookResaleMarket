import { Switch as SwitchPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const Switch = ({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) => (
  <SwitchPrimitive.Root
    className={cn(
      "inline-flex h-7 w-12 shrink-0 items-center rounded-full border border-glass-border bg-glass-2 p-0.5 transition-colors data-[state=checked]:border-brand data-[state=checked]:bg-brand disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb className="block size-5 rounded-full bg-ink-1 shadow transition-transform data-[state=checked]:translate-x-5 data-[state=checked]:bg-on-brand rtl:data-[state=checked]:-translate-x-5" />
  </SwitchPrimitive.Root>
);

export default Switch;
