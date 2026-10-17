import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import type { ModalProps } from "@/lib/types";
import { cn } from "@/lib/utils";

const Modal = ({
  trigger,
  title,
  description,
  closeLabel,
  className,
  children,
  ...props
}: ModalProps) => (
  <Dialog.Root {...props}>
    {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-scrim" />
      <Dialog.Content
        {...(!description && { "aria-describedby": undefined })}
        className={cn(
          "glass glass--3 fixed inset-x-0 top-1/2 z-50 mx-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg -translate-y-1/2 overflow-y-auto p-6 text-ink-1",
          className,
        )}
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
        {children && <div className="mt-4">{children}</div>}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);

export default Modal;
