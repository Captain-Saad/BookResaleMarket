import { Tooltip as TooltipPrimitive } from "radix-ui";
import type { TooltipProps } from "@/lib/types";

const Tooltip = ({ content, children, side = "top" }: TooltipProps) => (
  <TooltipPrimitive.Provider delayDuration={300}>
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className="glass glass--3 z-50 max-w-xs rounded-md px-3 py-1.5 text-sm text-ink-1"
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  </TooltipPrimitive.Provider>
);

export default Tooltip;
