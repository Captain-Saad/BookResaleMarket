import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { BADGE_DOT_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium text-ink-1",
  {
    variants: {
      tone: {
        neutral: "border-glass-border bg-glass-2",
        brand: "border-brand/50 bg-brand/15",
        success: "border-success/50 bg-success/15",
        warning: "border-warning/50 bg-warning/15",
        danger: "border-danger/50 bg-danger/15",
        info: "border-info/50 bg-info/15",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

type BadgeProps = ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

const Badge = ({ className, tone, children, ...props }: BadgeProps) => (
  <span className={cn(badgeVariants({ tone }), className)} {...props}>
    <span
      aria-hidden="true"
      className={cn("size-1.5 rounded-full", BADGE_DOT_COLORS[tone ?? "neutral"])}
    />
    {children}
  </span>
);

export default Badge;
