import { unstable_cache } from "next/cache";

import { DEFAULTS } from "@/constants/app";
import { CACHE_TAGS, CACHE_TIMES } from "@/constants/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  FilterStatus,
  GetPollsParams,
  PollsResponse,
  PollWithOptions,
  SortBy,
  SortOrder,
} from "@/lib/types";

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
 * @deprecated Use getPollsPaginated for better performance
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
    [CACHE_TAGS.POLLS], // 캐시 키
    {
      tags: [CACHE_TAGS.POLLS], // 캐시 태그
      revalidate: CACHE_TIMES.POLLS, // 60초마다 재검증
    }
  )();
}

/**
 * 페이지네이션을 지원하는 투표 목록을 가져옵니다.
 * @param params - 페이지네이션, 정렬, 필터링 파라미터
 * @returns 투표 목록과 페이지네이션 메타데이터
 */
export async function getPollsPaginated(
  params: GetPollsParams = {}
): Promise<{ data: PollsResponse | null; error: Error | null }> {
  const {
    limit = 20,
    offset = 0,
    sortBy = "created_at" as SortBy,
    sortOrder = "desc" as SortOrder,
    filterStatus = "all" as FilterStatus,
  } = params;

  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("get_polls_paginated", {
      p_limit: limit,
      p_offset: offset,
      p_sort_by: sortBy,
      p_sort_order: sortOrder,
      p_filter_status: filterStatus,
    });

    if (error) {
      console.error("Error fetching paginated polls:", error);
      return { data: null, error };
    }

    // Parse the response
    // The RPC returns an array of rows, each with total_count
    const polls = (data || []) as Array<PollWithOptions & { total_count: number }>;

    // Extract total count from first row (all rows have same total_count)
    const total = polls.length > 0 ? polls[0].total_count : 0;

    // Remove total_count from poll objects using destructuring
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const cleanedPolls: PollWithOptions[] = polls.map(({ total_count: _, ...poll }) => poll);

    // Calculate pagination metadata
    const hasNextPage = offset + limit < total;
    const nextOffset = hasNextPage ? offset + limit : null;

    const response: PollsResponse = {
      data: cleanedPolls,
      pagination: {
        total,
        limit,
        offset,
        hasNextPage,
        nextOffset,
      },
    };

    return { data: response, error: null };
  } catch (error) {
    console.error("Unexpected error fetching paginated polls:", error);
    return { data: null, error: error as Error };
  }
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
    [CACHE_TAGS.POLL(pollId)], // 캐시 키
    {
      tags: [CACHE_TAGS.POLL(pollId), CACHE_TAGS.POLLS], // 캐시 태그
      revalidate: CACHE_TIMES.POLL_DETAIL, // 30초마다 재검증
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
    [CACHE_TAGS.FEATURED_POLLS], // 캐시 키
    {
      tags: [CACHE_TAGS.FEATURED_POLLS, CACHE_TAGS.POLLS], // 캐시 태그
      revalidate: CACHE_TIMES.FEATURED_POLLS, // 120초(2분)마다 재검증
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

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    const error = new Error("Not authenticated");
    (error as Error & { code?: string }).code = "AUTH_REQUIRED";
    return { data: null, error };
  }

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
 * 즐겨찾기한 투표 목록을 가져옵니다.
 * 즐겨찾기는 사용자별 데이터이므로 캐시하지 않습니다.
 */
export async function getFavoritePolls() {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_favorite_polls");

  if (error) {
    console.error("Error fetching favorite polls:", error);
    return { data: null, error };
  }

  return { data: data as PollWithOptions[], error: null };
}

/**
 * 즐겨찾기 상태를 토글합니다.
 * @param pollId - 즐겨찾기할 투표 ID
 * @returns 현재 즐겨찾기 여부
 */
export async function toggleFavorite(pollId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("toggle_favorite", {
    p_poll_id: pollId,
  });

  if (error) {
    console.error("Error toggling favorite:", error);
    return { data: null, error };
  }

  const result = Array.isArray(data) && data.length > 0 ? data[0] : null;

  return { data: result?.is_favorited as boolean | null, error: null };
}

/**
 * 사용자 프로필 목록을 포인트 순으로 가져옵니다 (리더보드).
 * @param limit - 가져올 최대 개수 (기본값: 10)
 * @returns 프로필 목록과 오류 정보
 */
export async function getLeaderboard(limit: number = DEFAULTS.LEADERBOARD_LIMIT) {
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

/**
 * 현재 사용자가 특정 투표에 접근할 수 있는지 확인합니다.
 * @param pollId - 확인할 투표 ID
 * @returns 접근 가능 여부
 */
export async function canAccessPoll(pollId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("can_access_poll", {
    p_poll_id: pollId,
  });

  if (error) {
    console.error("Error checking poll access:", error);
    return { data: false, error };
  }

  return { data: data as boolean, error: null };
}

/**
 * 현재 사용자가 생성한 모든 투표 (공개 + 비공개)를 가져옵니다.
 * @returns 투표 목록과 오류 정보
 */
export async function getMyPolls() {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_my_polls_with_user_status");

  if (error) {
    console.error("Error fetching my polls:", error);
    return { data: null, error };
  }

  return { data: data as PollWithOptions[], error: null };
}
