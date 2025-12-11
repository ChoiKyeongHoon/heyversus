"use client";

import { useQuery,UseQueryResult } from "@tanstack/react-query";

import { useSupabase } from "@/hooks/useSupabase";

export interface CurrentProfile {
  id: string;
  username: string | null;
  full_name?: string | null;
  bio?: string | null;
  avatar_url: string | null;
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
export function useCurrentProfile(
  userId?: string
): UseQueryResult<CurrentProfile | null, Error> {
  const supabase = useSupabase();

  return useQuery<
    CurrentProfile | null,
    Error,
    CurrentProfile | null,
    [string, string | undefined]
  >({
    queryKey: ["current-profile", userId],
    enabled: Boolean(userId),
    staleTime: 10 * 1000,
    gcTime: 2 * 60 * 1000,
    queryFn: async (): Promise<CurrentProfile | null> => {
      const { data, error } = await supabase.rpc("get_profile");

      if (error) {
        throw new Error(error.message ?? "프로필을 불러오지 못했습니다.");
      }

      if (!data || typeof data !== "object") {
        return null;
      }

      const profile = data as CurrentProfile;

      return {
        ...profile,
        avatar_url: profile.avatar_url ?? null,
        points: Number(profile.points ?? 0),
      };
    },
  });
}
