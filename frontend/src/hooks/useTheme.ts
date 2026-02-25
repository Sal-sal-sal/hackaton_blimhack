import { useAppDispatch, useAppSelector } from "@/store";
import { setTheme, toggleTheme } from "@/features/ui/uiSlice";
import type { Theme } from "@/types";

export function useTheme() {
  const theme = useAppSelector((s) => s.ui.theme);
  const dispatch = useAppDispatch();

  return {
    theme,
    setTheme: (t: Theme) => dispatch(setTheme(t)),
    toggleTheme: () => dispatch(toggleTheme()),
    isDark: theme === "dark",
  };
}
