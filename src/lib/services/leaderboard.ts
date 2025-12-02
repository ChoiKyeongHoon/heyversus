import type { SupabaseClient } from "@supabase/supabase-js";

import { getAnonServerClient } from "@/lib/supabase/anon-server";
import { createClient } from "@/lib/supabase/server";
import type {
  GetLeaderboardParams,
  LeaderboardEntry,
  LeaderboardResponse,
} from "@/lib/types";

const DEFAULT_LIMIT = 20;

type LeaderboardRow = LeaderboardEntry & { total_count?: number };

export async function fetchLeaderboard(
  supabase: SupabaseClient,
  params: Required<GetLeaderboardParams>
): Promise<{ data: LeaderboardResponse | null; error: Error | null }> {
  const { limit, offset, scope, sortBy, sortOrder, period, region } = params;

  const { data, error } = await supabase.rpc("get_leaderboard", {
    p_limit: limit,
    p_offset: offset,
    p_scope: scope,
    p_sort_by: sortBy,
    p_sort_order: sortOrder,
    p_period: period,
    p_region: region ?? null,
  });

  if (error) {
    console.error("Error fetching leaderboard:", error);
    return { data: null, error };
  }

  const rows = (data || []) as LeaderboardRow[];
  const total = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
  const cleanedRows: LeaderboardEntry[] = rows.map(({ total_count, ...row }) => {
    void total_count;
    return row;
  });
  const hasNextPage = offset + limit < total;
  const nextOffset = hasNextPage ? offset + limit : null;

  const response: LeaderboardResponse = {
    data: cleanedRows,
    pagination: {
      total,
      limit,
      offset,
      hasNextPage,
      nextOffset,
    },
  };

  return { data: response, error: null };
}

export async function getLeaderboard(
  params: GetLeaderboardParams = {},
  options?: { useAnonClient?: boolean }
): Promise<{ data: LeaderboardResponse | null; error: Error | null }> {
  const {
    limit = DEFAULT_LIMIT,
    offset = 0,
    scope = "global",
    sortBy = "score",
    sortOrder = "desc",
    period = "all",
    region = null,
  } = params;

  try {
    const supabase = options?.useAnonClient
      ? getAnonServerClient()
      : await createClient();

    return fetchLeaderboard(supabase, {
      limit,
      offset,
      scope,
      sortBy,
      sortOrder,
      period,
      region,
    });
  } catch (error) {
    console.error("Unexpected error fetching leaderboard:", error);
    return { data: null, error: error as Error };
  }
}
