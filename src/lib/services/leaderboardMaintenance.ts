import { getServiceRoleClient } from "@/lib/supabase/service-role";

export interface RefreshProfileScoresParams {
  limit?: number;
  offset?: number;
}

/**
 * refresh_profile_scores RPC를 호출해 프로필 점수를 집계합니다.
 * service_role 키를 사용하므로 서버/배치 환경에서만 호출하세요.
 */
export async function refreshProfileScoresBatch({
  limit = 500,
  offset = 0,
}: RefreshProfileScoresParams = {}) {
  const supabase = getServiceRoleClient();

  const { error } = await supabase.rpc("refresh_profile_scores", {
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    console.error("refresh_profile_scores RPC error:", error);
    return { error };
  }

  return { error: null };
}
