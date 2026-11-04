import { cva } from "class-variance-authority";
import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import type { DrawerProps } from "@/lib/types";
import { cn } from "@/lib/utils";

const drawerVariants = cva(
  "glass glass--3 fixed z-50 flex flex-col overflow-y-auto p-6 text-ink-1",
  {
    variants: {
      side: {
        end: "inset-y-3 end-3 w-[min(24rem,calc(100%-1.5rem))]",
        bottom: "inset-x-3 bottom-3 max-h-[85dvh]",
      },
    },
    defaultVariants: { side: "end" },
  },
);

const Drawer = ({
  trigger,
  title,
  description,
  closeLabel,
  side,
  className,
  children,
  ...props
}: DrawerProps) => (
  <Dialog.Root {...props}>
    {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-scrim" />
      <Dialog.Content
        {...(!description && { "aria-describedby": undefined })}
        className={cn(drawerVariants({ side }), className)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <Dialog.Title className="font-display text-h3">{title}</Dialog.Title>
            {description && (
              <Dialog.Description className="text-ink-2">{description}</Dialog.Description>
            )}
          </div>
          <Dialog.Close
            aria-label={closeLabel}
            className="-me-2 -mt-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-glass-3"
          >
            <X aria-hidden="true" className="size-5" />
          </Dialog.Close>
        </div>
        {children && <div className="mt-4 flex-1">{children}</div>}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);

export default Drawer;
