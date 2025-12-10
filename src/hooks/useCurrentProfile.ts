"use client";

import { useQuery } from "@tanstack/react-query";

import { useSupabase } from "@/hooks/useSupabase";

export interface CurrentProfile {
  id: string;
  username: string | null;
  full_name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  points: number;
  email?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * 현재 로그인한 사용자의 프로필 정보를 가져오는 훅
 *
 * @param userId - 세션 사용자 ID (없으면 쿼리를 실행하지 않음)
 */
export function useCurrentProfile(userId?: string) {
  const supabase = useSupabase();

  return useQuery<CurrentProfile>({
    queryKey: ["current-profile", userId],
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_profile");

      if (error) {
        throw new Error(error.message ?? "프로필을 불러오지 못했습니다.");
      }

      if (!data || typeof data !== "object") {
        throw new Error("프로필을 찾을 수 없습니다.");
      }

      const profile = data as CurrentProfile;
      let points = Number(profile.points ?? 0);

      const { data: scoreRows, error: scoreError } = await supabase
        .from("profile_scores")
        .select("score")
        .eq("user_id", profile.id)
        .limit(1);

      if (scoreError) {
        console.error("Error fetching profile score (client):", scoreError);
      } else if (scoreRows?.[0]?.score !== undefined && scoreRows[0]?.score !== null) {
        points = Number(scoreRows[0].score);
      }

      return {
        ...profile,
        points,
      };
    },
  });
}
