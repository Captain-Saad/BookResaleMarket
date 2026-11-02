import { THEME_STORAGE_KEY } from "@/lib/constants";
import { Theme } from "@/lib/types";

const THEME_ATTRIBUTE = "data-theme";
const THEMES: readonly string[] = Object.values(Theme);

const isTheme = (value: unknown): value is Theme =>
  typeof value === "string" && THEMES.includes(value);

const systemTheme = (): Theme =>
  window.matchMedia("(prefers-color-scheme: light)").matches ? Theme.Light : Theme.Dark;

export const getPreferredTheme = (): Theme => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (isTheme(stored)) return stored;
  } catch {}
  return systemTheme();
};

export const getAppliedTheme = (): Theme | null => {
  const applied = document.documentElement.getAttribute(THEME_ATTRIBUTE);
  return isTheme(applied) ? applied : null;
};

export const nextTheme = (current: Theme | null): Theme =>
  current === Theme.Light ? Theme.Dark : Theme.Light;

export const applyTheme = (theme: Theme) => {
  document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);
};

export const saveTheme = (theme: Theme) => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {}
};

const DARK = JSON.stringify(Theme.Dark);
const LIGHT = JSON.stringify(Theme.Light);

export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t!==${DARK}&&t!==${LIGHT}){t=matchMedia("(prefers-color-scheme: light)").matches?${LIGHT}:${DARK}}document.documentElement.setAttribute(${JSON.stringify(THEME_ATTRIBUTE)},t)}catch(e){}})()`;
