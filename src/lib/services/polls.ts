import { createClient } from "@/lib/supabase/server";
import type { PollWithOptions } from "@/lib/types";
import { unstable_cache } from "next/cache";

/**
 * Poll Service Layer
 *
 * 이 파일은 투표 관련 비즈니스 로직을 캡슐화하여
 * 재사용성과 유지보수성을 향상시킵니다.
 *
 * Next.js 캐싱 전략:
 * - getPolls: 60초 캐시, 'polls' 태그
 * - getPollById: 30초 캐시, 'poll-{id}' 태그
 * - getFeaturedPolls: 120초 캐시, 'featured-polls' 태그
 */

export interface CreatePollParams {
  question: string;
  options: string[];
  isPublic: boolean;
  expiresAt?: string | null;
}

export interface VoteParams {
  optionId: string;
  pollId: string;
}

/**
 * 모든 공개 투표 목록을 가져옵니다.
 * @returns 투표 목록과 오류 정보
 */
export async function getPolls() {
  return unstable_cache(
    async () => {
      const supabase = await createClient();

      const { data, error } = await supabase.rpc("get_polls_with_user_status");

      if (error) {
        console.error("Error fetching polls:", error);
        return { data: null, error };
      }

      return { data: data as PollWithOptions[], error: null };
    },
    ["polls"], // 캐시 키
    {
      tags: ["polls"], // 캐시 태그
      revalidate: 60, // 60초마다 재검증
    }
  )();
}

/**
 * 특정 ID의 투표를 가져옵니다.
 * @param pollId - 투표 ID
 * @returns 투표 정보와 오류 정보
 */
export async function getPollById(pollId: string) {
  return unstable_cache(
    async () => {
      const supabase = await createClient();

      const { data, error } = await supabase.rpc("get_poll_with_user_status", {
        p_id: pollId,
      });

      if (error) {
        console.error("Error fetching poll:", error);
        return { data: null, error };
      }

      // RPC는 배열을 반환하므로 첫 번째 항목을 가져옵니다
      const poll = data && data.length > 0 ? data[0] : null;

      return { data: poll as PollWithOptions | null, error: null };
    },
    [`poll-${pollId}`], // 캐시 키
    {
      tags: [`poll-${pollId}`, "polls"], // 캐시 태그
      revalidate: 30, // 30초마다 재검증
    }
  )();
}

/**
 * 대표 투표 목록을 가져옵니다.
 * @returns 대표 투표 목록과 오류 정보
 */
export async function getFeaturedPolls() {
  return unstable_cache(
    async () => {
      const supabase = await createClient();

      const { data, error } = await supabase.rpc(
        "get_featured_polls_with_user_status"
      );

      if (error) {
        console.error("Error fetching featured polls:", error);
        return { data: null, error };
      }

      return { data: data as PollWithOptions[], error: null };
    },
    ["featured-polls"], // 캐시 키
    {
      tags: ["featured-polls", "polls"], // 캐시 태그
      revalidate: 120, // 120초(2분)마다 재검증
    }
  )();
}

/**
 * 새로운 투표를 생성합니다.
 * @param params - 투표 생성 파라미터
 * @returns 생성된 투표 ID와 오류 정보
 */
export async function createPoll(params: CreatePollParams) {
  const supabase = await createClient();

  const { data: pollId, error } = await supabase.rpc("create_new_poll", {
    question_text: params.question,
    option_texts: params.options,
    is_public: params.isPublic,
    expires_at_param: params.expiresAt
      ? new Date(params.expiresAt).toISOString()
      : null,
  });

  if (error) {
    console.error("Error creating poll:", error);
    return { data: null, error };
  }

  return { data: pollId as string, error: null };
}

/**
 * 투표에 참여합니다.
 * @param params - 투표 파라미터 (옵션 ID, 투표 ID)
 * @returns 오류 정보
 */
export async function voteOnPoll(params: VoteParams) {
  const supabase = await createClient();

  const { error } = await supabase.rpc("increment_vote", {
    option_id_to_update: params.optionId,
    poll_id_for_vote: params.pollId,
  });

  if (error) {
    console.error("Error voting on poll:", error);
    return { error };
  }

  return { error: null };
}

/**
 * 사용자 프로필 목록을 포인트 순으로 가져옵니다 (리더보드).
 * @param limit - 가져올 최대 개수 (기본값: 10)
 * @returns 프로필 목록과 오류 정보
 */
export async function getLeaderboard(limit: number = 10) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, points, updated_at")
    .order("points", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching leaderboard:", error);
    return { data: null, error };
  }

  return { data, error: null };
}
