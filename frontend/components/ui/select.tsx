import { Check, ChevronDown } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import type { SelectProps } from "@/lib/types";
import { cn, fieldClassName } from "@/lib/utils";

const Select = ({
  id,
  options,
  placeholder,
  className,
  "aria-invalid": ariaInvalid,
  ...props
}: SelectProps) => (
  <SelectPrimitive.Root {...props}>
    <SelectPrimitive.Trigger
      id={id}
      aria-invalid={ariaInvalid}
      className={cn(
        fieldClassName,
        "flex min-h-11 items-center justify-between gap-2 text-start data-placeholder:text-ink-3",
        className,
      )}
    >
      <SelectPrimitive.Value placeholder={placeholder} />
      <SelectPrimitive.Icon>
        <ChevronDown aria-hidden="true" className="size-4 text-ink-2" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position="popper"
        sideOffset={6}
        className="glass glass--3 z-50 max-h-72 min-w-(--radix-select-trigger-width) overflow-hidden rounded-md p-1 text-ink-1"
      >
        <SelectPrimitive.Viewport>
          {options.map((option) => (
            <SelectPrimitive.Item
              key={option.value}
              value={option.value}
              className="relative flex min-h-11 cursor-pointer items-center rounded-sm ps-9 pe-3 outline-none select-none data-disabled:opacity-50 data-highlighted:bg-glass-3"
            >
              <SelectPrimitive.ItemIndicator className="absolute start-3">
                <Check aria-hidden="true" className="size-4" />
              </SelectPrimitive.ItemIndicator>
              <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
            </SelectPrimitive.Item>
          ))}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  </SelectPrimitive.Root>
);

export default Select;
