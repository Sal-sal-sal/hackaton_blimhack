import { useAppDispatch, useAppSelector } from "@/store";
import { setCredentials, logout as logoutAction } from "@/features/auth/authSlice";
import type { User } from "@/types";

export function useAuth() {
  const auth = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();

  return {
    user: auth.user,
    token: auth.token,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    login: (user: User, token: string) => dispatch(setCredentials({ user, token })),
    logout: () => dispatch(logoutAction()),
  };
}
