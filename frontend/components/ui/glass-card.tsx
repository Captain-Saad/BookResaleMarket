import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const glassCardVariants = cva("glass", {
  variants: {
    tier: { 1: "glass--1", 2: "glass--2", 3: "glass--3", flat: "glass--flat" },
    padding: { none: "", sm: "p-4", md: "p-6", lg: "p-8" },
  },
  defaultVariants: { tier: 2, padding: "md" },
});

type GlassCardProps = ComponentProps<"div"> &
  VariantProps<typeof glassCardVariants> & { asChild?: boolean };

const GlassCard = ({ className, tier, padding, asChild = false, ...props }: GlassCardProps) => {
  const Component = asChild ? Slot.Root : "div";
  return <Component className={cn(glassCardVariants({ tier, padding }), className)} {...props} />;
};

export default GlassCard;
