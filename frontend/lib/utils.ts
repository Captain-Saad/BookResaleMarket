import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const twMerge = extendTailwindMerge({
  extend: { theme: { text: ["display", "h1", "h2", "h3"] } },
});

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export const fieldClassName =
  "w-full rounded-md border border-glass-border bg-glass-1 px-4 text-ink-1 placeholder:text-ink-3 transition-colors hover:bg-glass-2 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger";
