import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "@/store";

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL || "/api",
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ["User", "Dashboard"],
  endpoints: (builder) => ({
    // Demo endpoints — replace with real API
    getDashboardStats: builder.query<DashboardStats, void>({
      queryFn: async () => {
        // Fake data for demo — replace with real endpoint
        return {
          data: {
            totalUsers: 1284,
            activeProjects: 42,
            revenue: "$12,450",
            growth: "+12.5%",
          },
        };
      },
      providesTags: ["Dashboard"],
    }),
    getCurrentUser: builder.query<{ id: string; email: string; name: string }, void>({
      query: () => "/auth/me",
      providesTags: ["User"],
    }),
  }),
});

interface DashboardStats {
  totalUsers: number;
  activeProjects: number;
  revenue: string;
  growth: string;
}

export const { useGetDashboardStatsQuery, useGetCurrentUserQuery } = apiSlice;
