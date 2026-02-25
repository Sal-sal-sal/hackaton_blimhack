import { useEffect } from "react";
import { useAppSelector } from "@/store";

export function ThemeInitializer() {
  const theme = useAppSelector((s) => s.ui.theme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return null;
}
