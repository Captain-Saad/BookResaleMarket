import { beforeEach, describe, expect, it, vi } from "vitest";
import { THEME_STORAGE_KEY } from "@/lib/constants";
import { applyTheme, getPreferredTheme, nextTheme, saveTheme, THEME_SCRIPT } from "@/lib/theme";
import { Theme } from "@/lib/types";

const mockSystemTheme = (theme: Theme) => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: query === "(prefers-color-scheme: light)" && theme === Theme.Light,
    })),
  );
};

describe("getPreferredTheme", () => {
  beforeEach(() => {
    mockSystemTheme(Theme.Dark);
  });

  it("uses the saved choice first", () => {
    mockSystemTheme(Theme.Light);
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    expect(getPreferredTheme()).toBe(Theme.Dark);
  });

  it("follows the system preference when nothing is saved", () => {
    mockSystemTheme(Theme.Light);
    expect(getPreferredTheme()).toBe(Theme.Light);
  });

  it("defaults to dark", () => {
    expect(getPreferredTheme()).toBe(Theme.Dark);
  });

  it("ignores an invalid saved value", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "purple");
    expect(getPreferredTheme()).toBe(Theme.Dark);
  });
});

describe("applyTheme and saveTheme", () => {
  it("sets data-theme on <html> and persists the choice", () => {
    applyTheme(Theme.Light);
    saveTheme(Theme.Light);
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(Theme.Light);
  });
});

describe("nextTheme", () => {
  it("flips between light and dark", () => {
    expect(nextTheme(Theme.Light)).toBe(Theme.Dark);
    expect(nextTheme(Theme.Dark)).toBe(Theme.Light);
  });

  it("switches to light when no theme is applied yet", () => {
    expect(nextTheme(null)).toBe(Theme.Light);
  });
});

describe("THEME_SCRIPT", () => {
  it("applies the saved theme when run as the inline head script", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    document.documentElement.removeAttribute("data-theme");
    new Function(THEME_SCRIPT)();
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
  });
});
