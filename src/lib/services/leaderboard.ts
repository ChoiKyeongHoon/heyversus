import type { SupabaseClient } from "@supabase/supabase-js";

import { getAnonServerClient } from "@/lib/supabase/anon-server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";
import type {
  GetLeaderboardParams,
  LeaderboardEntry,
  LeaderboardResponse,
} from "@/lib/types";

const DEFAULT_LIMIT = 20;

type LeaderboardRow = LeaderboardEntry & { total_count?: number };

async function fetchProfilesFallback(limit: number, offset: number) {
  // 서비스 롤 키가 있으면 RLS를 우회해 안전하게 조회, 없으면 anon 클라이언트 사용
  const supabase =
    process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL
      ? getServiceRoleClient()
      : getAnonServerClient();

  const { data, error, count } = await supabase
    .from("profiles")
    .select("id as user_id, username as display_name, points, updated_at", { count: "exact" })
    .order("points", { ascending: false })
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching profiles fallback:", error?.message || error);
    return { data: null, error };
  }

  const rows: LeaderboardEntry[] =
    data?.map((row, idx) => ({
      user_id: row.user_id,
      rank: offset + idx + 1,
      score: row.points ?? 0,
      display_name: row.display_name ?? null,
      avatar_url: null,
    })) ?? [];

  return {
    data: {
      data: rows,
      pagination: {
        total: count ?? rows.length,
        limit,
        offset,
        hasNextPage: count ? offset + limit < count : false,
        nextOffset: count && offset + limit < count ? offset + limit : null,
      },
    } as LeaderboardResponse,
    error: null,
  };
}

async function triggerRefreshProfileScores() {
  try {
    const supabase = getServiceRoleClient();
    const { error } = await supabase.rpc("refresh_profile_scores", {
      p_limit: 500,
      p_offset: 0,
    });

    if (error) {
      console.error("refresh_profile_scores RPC error (best-effort):", error);
    }
  } catch (error) {
    console.error("Failed to trigger refresh_profile_scores:", error);
  }
}

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
      : await (await import("@/lib/supabase/server")).createClient();

    const result = await fetchLeaderboard(supabase, {
      limit,
      offset,
      scope,
      sortBy,
      sortOrder,
      period,
      region,
    });

    if (result.data?.data?.length) {
      return result;
    }

    // fallback: profile_scores가 비었거나 RPC 실패 시 profiles.points 기반으로 리더보드 표시
    const fallback = await fetchProfilesFallback(limit, offset);

    // profile_scores를 best-effort로 채우기 위한 비동기 리프레시 (환경 변수 없으면 실패 로그만)
    if (!result.data || !result.data.data.length) {
      void triggerRefreshProfileScores();
    }

    return fallback;
  } catch (error) {
    console.error("Unexpected error fetching leaderboard:", error);
    return { data: null, error: error as Error };
  }
}
