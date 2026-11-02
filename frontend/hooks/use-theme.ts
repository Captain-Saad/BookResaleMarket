import { useCallback, useLayoutEffect } from "react";
import { applyTheme, getAppliedTheme, getPreferredTheme, nextTheme, saveTheme } from "@/lib/theme";

const useTheme = () => {
  useLayoutEffect(() => {
    applyTheme(getPreferredTheme());
  }, []);

  const toggleTheme = useCallback(() => {
    const next = nextTheme(getAppliedTheme());
    applyTheme(next);
    saveTheme(next);
  }, []);

  return { toggleTheme };
};

export default useTheme;
