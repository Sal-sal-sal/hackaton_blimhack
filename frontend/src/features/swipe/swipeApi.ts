import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "@/store";
import type { SwipeCard } from "./types";

interface JobPostRaw {
  id: number;
  title: string;
  description: string;
  tech_stack: string[];
  salary_min: number | null;
  salary_max: number | null;
  organization: { id: number; name: string; logo_url: string | null } | null;
}

function formatSalary(min: number | null, max: number | null): string | undefined {
  if (min && max) return `${Math.round(min / 1000)}k – ${Math.round(max / 1000)}k ₽`;
  if (min) return `от ${Math.round(min / 1000)}k ₽`;
  if (max) return `до ${Math.round(max / 1000)}k ₽`;
  return undefined;
}

function mapJobPost(jp: JobPostRaw): SwipeCard {
  return {
    id: jp.id,
    type: "job_post",
    title: jp.title,
    subtitle: jp.organization?.name,
    salary: formatSalary(jp.salary_min, jp.salary_max),
    tags: jp.tech_stack,
    description: jp.description,
    logoUrl: jp.organization?.logo_url ?? undefined,
  };
}

export const swipeApi = createApi({
  reducerPath: "swipeApi",
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
  endpoints: (builder) => ({
    getJobPostsForSwipe: builder.query<SwipeCard[], void>({
      query: () => "/job-posts/?limit=50",
      transformResponse: (res: JobPostRaw[]) => res.map(mapJobPost),
    }),

    likeJobPost: builder.mutation<{ liked: boolean; likes_count: number }, number>({
      query: (id) => ({
        url: "/likes/toggle",
        method: "POST",
        body: { target_type: "job_post", target_id: id },
      }),
    }),
  }),
});

export const { useGetJobPostsForSwipeQuery, useLikeJobPostMutation } = swipeApi;
