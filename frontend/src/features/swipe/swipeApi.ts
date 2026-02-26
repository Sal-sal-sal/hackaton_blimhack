import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "@/store";
import type { SwipeCard } from "./types";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

interface JobPostRaw {
  id: number;
  title: string;
  description: string;
  tech_stack: string[];
  salary_min: number | null;
  salary_max: number | null;
  organization: { id: number; name: string; logo_url: string | null } | null;
}

interface HHSwipeCard {
  id: string;
  source: "hh";
  title: string;
  subtitle: string | null;
  salary: string | null;
  tags: string[];
  description: string | null;
  logoUrl: string | null;
  imageUrl: string | null;
  location: string | null;
  url: string | null;
  experience: string | null;
  schedule: string | null;
  employment: string | null;
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
    source: "local",
    title: jp.title,
    subtitle: jp.organization?.name,
    salary: formatSalary(jp.salary_min, jp.salary_max),
    tags: jp.tech_stack,
    description: jp.description,
    logoUrl: jp.organization?.logo_url ?? undefined,
  };
}

function mapHHCard(hh: HHSwipeCard): SwipeCard {
  return {
    id: `hh_${hh.id}`,
    type: "job_post",
    source: "hh",
    title: hh.title,
    subtitle: hh.subtitle ?? undefined,
    salary: hh.salary ?? undefined,
    tags: hh.tags,
    description: hh.description ?? undefined,
    logoUrl: hh.logoUrl ?? undefined,
    imageUrl: hh.imageUrl ?? undefined,
    location: hh.location ?? undefined,
    url: hh.url ?? undefined,
    experience: hh.experience ?? undefined,
    schedule: hh.schedule ?? undefined,
    employment: hh.employment ?? undefined,
  };
}

/** Interleave two arrays: [a1, b1, a2, b2, ...remaining] */
function interleave<T>(a: T[], b: T[]): T[] {
  const result: T[] = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (i < a.length) result.push(a[i]);
    if (i < b.length) result.push(b[i]);
  }
  return result;
}

export const swipeApi = createApi({
  reducerPath: "swipeApi",
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE,
    prepareHeaders: (headers, { getState }) => {
      const state = getState() as RootState;
      const token = state.auth.token;
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      const userId = state.auth.user?.id;
      if (userId) {
        headers.set("X-User-Id", String(userId));
      }
      return headers;
    },
  }),
  endpoints: (builder) => ({
    getJobPostsForSwipe: builder.query<SwipeCard[], void>({
      query: () => "/job-posts/?limit=50",
      transformResponse: (res: JobPostRaw[]) => res.map(mapJobPost),
    }),

    getHHSwipeFeed: builder.query<SwipeCard[], { q: string; area?: number }>({
      query: ({ q, area = 1 }) =>
        `/career-ai/hh-swipe-feed?q=${encodeURIComponent(q)}&area=${area}&per_page=20`,
      transformResponse: (res: HHSwipeCard[]) => res.map(mapHHCard),
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

export const {
  useGetJobPostsForSwipeQuery,
  useGetHHSwipeFeedQuery,
  useLikeJobPostMutation,
} = swipeApi;

/** Merge local job posts with HH vacancies, interleaved */
export function mergeSwipeDecks(local: SwipeCard[], hh: SwipeCard[]): SwipeCard[] {
  return interleave(local, hh);
}
