import { X } from "lucide-react";
import { Toast as ToastPrimitive } from "radix-ui";
import { TOAST_TONE_BORDERS } from "@/lib/constants";
import { type ChildrenProps, type ToastProps, ToastTone } from "@/lib/types";
import { cn } from "@/lib/utils";

export const ToastProvider = ({ children }: ChildrenProps) => (
  <ToastPrimitive.Provider duration={5000} swipeDirection="right">
    {children}
    <ToastPrimitive.Viewport className="fixed end-3 bottom-24 z-50 flex w-[min(24rem,calc(100%-1.5rem))] flex-col gap-2 outline-none md:bottom-3" />
  </ToastPrimitive.Provider>
);

const Toast = ({
  title,
  description,
  dismissLabel,
  tone = ToastTone.Neutral,
  className,
  ...props
}: ToastProps) => (
  <ToastPrimitive.Root
    type={tone === ToastTone.Danger ? "foreground" : "background"}
    className={cn(
      "glass glass--3 flex items-start gap-3 border-s-4 p-4 text-ink-1",
      TOAST_TONE_BORDERS[tone],
      className,
    )}
    {...props}
  >
    <div className="flex flex-1 flex-col gap-1">
      <ToastPrimitive.Title className="font-medium">{title}</ToastPrimitive.Title>
      {description && (
        <ToastPrimitive.Description className="text-sm text-ink-2">
          {description}
        </ToastPrimitive.Description>
      )}
    </div>
    <ToastPrimitive.Close
      aria-label={dismissLabel}
      className="-me-2 -mt-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-glass-3"
    >
      <X aria-hidden="true" className="size-4" />
    </ToastPrimitive.Close>
  </ToastPrimitive.Root>
);

export default Toast;
