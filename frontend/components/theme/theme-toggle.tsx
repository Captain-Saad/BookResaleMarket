"use client";

import { Moon, Sun } from "lucide-react";
import useTheme from "@/hooks/use-theme";
import type { ThemeToggleProps } from "@/lib/types";

const ThemeToggle = ({ label }: ThemeToggleProps) => {
  const { toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      className="inline-flex size-11 items-center justify-center rounded-full text-ink-1 transition-colors hover:bg-glass-3"
    >
      <Sun aria-hidden="true" className="hidden size-5 dark:block" />
      <Moon aria-hidden="true" className="size-5 dark:hidden" />
    </button>
  );
};

export default ThemeToggle;
