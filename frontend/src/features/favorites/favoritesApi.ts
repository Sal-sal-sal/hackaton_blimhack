import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "@/store";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

export interface FavoriteCreate {
  vacancy_id: string;
  source: string;
  title: string;
  subtitle?: string | null;
  salary?: string | null;
  tags?: string[];
  description?: string | null;
  logo_url?: string | null;
  location?: string | null;
  url?: string | null;
}

export interface FavoriteResponse {
  id: number;
  user_id: number;
  vacancy_id: string;
  source: string;
  title: string;
  subtitle: string | null;
  salary: string | null;
  tags: string[];
  description: string | null;
  logo_url: string | null;
  location: string | null;
  url: string | null;
  created_at: string;
}

export interface FavMatch {
  title: string;
  match_percent: number;
  hire_chance: number;
  matching_skills: string[];
  missing_skills: string[];
}

export interface FavGap {
  skill: string;
  priority: string;
  vacancies_count: number;
}

export interface FavoritesAnalysis {
  matches: FavMatch[];
  gaps: FavGap[];
  common_themes: string[];
  recommendations: string[];
}

export const favoritesApi = createApi({
  reducerPath: "favoritesApi",
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE,
    prepareHeaders: (headers, { getState }) => {
      const state = getState() as RootState;
      const token = state.auth.token;
      if (token) headers.set("Authorization", `Bearer ${token}`);
      const userId = state.auth.user?.id;
      if (userId) headers.set("X-User-Id", String(userId));
      return headers;
    },
  }),
  tagTypes: ["Favorites"],
  endpoints: (builder) => ({
    getFavorites: builder.query<FavoriteResponse[], void>({
      query: () => "/favorites/",
      providesTags: ["Favorites"],
    }),

    addFavorite: builder.mutation<FavoriteResponse, FavoriteCreate>({
      query: (body) => ({
        url: "/favorites/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Favorites"],
    }),

    deleteFavorite: builder.mutation<{ ok: boolean }, number>({
      query: (id) => ({
        url: `/favorites/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Favorites"],
    }),

    analyzeFavorites: builder.mutation<FavoritesAnalysis, void>({
      query: () => ({
        url: "/career-ai/analyze-favorites",
        method: "POST",
      }),
    }),
  }),
});

export const {
  useGetFavoritesQuery,
  useAddFavoriteMutation,
  useDeleteFavoriteMutation,
  useAnalyzeFavoritesMutation,
} = favoritesApi;
