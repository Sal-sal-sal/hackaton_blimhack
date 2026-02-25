import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Theme, UiState } from "@/types";

function getInitialTheme(): Theme {
  const saved = localStorage.getItem("theme") as Theme | null;
  if (saved) return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

const initialState: UiState = {
  theme: getInitialTheme(),
  sidebarOpen: true,
  sidebarCollapsed: localStorage.getItem("sidebar-collapsed") === "true",
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<Theme>) {
      state.theme = action.payload;
      localStorage.setItem("theme", action.payload);
      document.documentElement.setAttribute("data-theme", action.payload);
    },
    toggleTheme(state) {
      const next = state.theme === "light" ? "dark" : "light";
      state.theme = next;
      localStorage.setItem("theme", next);
      document.documentElement.setAttribute("data-theme", next);
    },
    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.sidebarOpen = action.payload;
    },
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    toggleSidebarCollapsed(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
      localStorage.setItem("sidebar-collapsed", String(state.sidebarCollapsed));
    },
    setSidebarCollapsed(state, action: PayloadAction<boolean>) {
      state.sidebarCollapsed = action.payload;
      localStorage.setItem("sidebar-collapsed", String(action.payload));
    },
  },
});

export const {
  setTheme,
  toggleTheme,
  setSidebarOpen,
  toggleSidebar,
  toggleSidebarCollapsed,
  setSidebarCollapsed,
} = uiSlice.actions;
export default uiSlice.reducer;
