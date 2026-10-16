"use client";

import { Moon, Sun } from "lucide-react";
import { useLayoutEffect } from "react";
import { applyTheme, getPreferredTheme, saveTheme, type Theme } from "@/lib/theme";

const ThemeToggle = () => {
  useLayoutEffect(() => {
    applyTheme(getPreferredTheme());
  }, []);

  const toggle = () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next: Theme = current === "light" ? "dark" : "light";
    applyTheme(next);
    saveTheme(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle color theme"
      className="inline-flex size-11 items-center justify-center rounded-full text-ink-1 transition-colors hover:bg-glass-3"
    >
      <Sun aria-hidden="true" className="hidden size-5 dark:block" />
      <Moon aria-hidden="true" className="size-5 dark:hidden" />
    </button>
  );
};

export default ThemeToggle;
