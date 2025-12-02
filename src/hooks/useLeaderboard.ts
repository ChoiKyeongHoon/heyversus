"use client";

import { useQuery } from "@tanstack/react-query";

import { useSupabase } from "@/hooks/useSupabase";
import { fetchLeaderboard } from "@/lib/services/leaderboard";
import type { GetLeaderboardParams, LeaderboardResponse } from "@/lib/types";

export function useLeaderboard(params: GetLeaderboardParams = {}) {
  const {
    limit = 20,
    offset = 0,
    scope = "global",
    sortBy = "score",
    sortOrder = "desc",
    period = "all",
    region = null,
  } = params;

  const supabase = useSupabase();

  return useQuery<LeaderboardResponse>({
    queryKey: [
      "leaderboard",
      { limit, offset, scope, sortBy, sortOrder, period, region },
    ],
    queryFn: async () => {
      const { data, error } = await fetchLeaderboard(supabase, {
        limit,
        offset,
        scope,
        sortBy,
        sortOrder,
        period,
        region,
      });

      if (error || !data) {
        throw error ?? new Error("Failed to fetch leaderboard");
      }

      return data;
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
}
