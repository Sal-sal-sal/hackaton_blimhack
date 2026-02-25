export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface UiState {
  theme: "light" | "dark";
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
}

export type Theme = "light" | "dark";
