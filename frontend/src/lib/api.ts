import axios from "axios";
import { store } from "@/store";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const { token, user } = store.getState().auth;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (user?.id) {
    config.headers["X-User-Id"] = String(user.id);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      store.dispatch({ type: "auth/logout" });
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export default api;
