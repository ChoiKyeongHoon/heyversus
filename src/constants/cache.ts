/**
 * Next.js 캐시 태그 및 재검증 시간 상수
 *
 * unstable_cache와 revalidatePath에서 사용하는 캐시 관련 설정을 중앙 관리합니다.
 */

/**
 * 캐시 태그
 */
export const CACHE_TAGS = {
  /** 전체 투표 목록 태그 */
  POLLS: "polls",
  /** 특정 투표 태그 (함수로 ID 전달) */
  POLL: (id: string) => `poll-${id}`,
  /** 대표 투표 목록 태그 */
  FEATURED_POLLS: "featured-polls",
  /** 리더보드 데이터 태그 */
  LEADERBOARD: "leaderboard",
} as const;

/**
 * 캐시 재검증 시간 (초 단위)
 */
export const CACHE_TIMES = {
  /** 전체 투표 목록 캐시 시간 */
  POLLS: 60,
  /** 특정 투표 상세 캐시 시간 */
  POLL_DETAIL: 30,
  /** 대표 투표 목록 캐시 시간 */
  FEATURED_POLLS: 120,
  /** 리더보드 캐시 시간 */
  LEADERBOARD: 120,
} as const;
