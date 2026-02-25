import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthState, User } from "@/types";

const persisted = localStorage.getItem("auth");
const initial: AuthState = persisted
  ? JSON.parse(persisted)
  : { user: null, token: null, isAuthenticated: false, isLoading: false };

const authSlice = createSlice({
  name: "auth",
  initialState: initial,
  reducers: {
    setCredentials(state, action: PayloadAction<{ user: User; token: string }>) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.isLoading = false;
      localStorage.setItem("auth", JSON.stringify(state));
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      localStorage.removeItem("auth");
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
  },
});

export const { setCredentials, logout, setLoading } = authSlice.actions;
export default authSlice.reducer;
