import { NextRequest, NextResponse } from "next/server";

import {
  createPoll,
  type CreatePollParams,
  getPolls,
  getPollsPaginated,
} from "@/lib/services/polls";
import type { GetPollsParams } from "@/lib/types";

/**
 * GET /api/polls
 * 투표 목록을 조회합니다. 페이지네이션, 정렬, 필터링을 지원합니다.
 *
 * Query Parameters:
 * - limit: 페이지 크기 (기본값: 20, 최대: 100)
 * - offset: 시작 위치 (기본값: 0)
 * - sortBy: 정렬 기준 (created_at | votes | expires_at, 기본값: created_at)
 * - sortOrder: 정렬 순서 (asc | desc, 기본값: desc)
 * - filterStatus: 상태 필터 (all | active | closed, 기본값: all)
 * - paginated: true면 페이지네이션 사용, false면 전체 목록 (기본값: true)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Check if pagination is disabled (for backward compatibility)
    const usePagination = searchParams.get('paginated') !== 'false';

    if (!usePagination) {
      // Legacy behavior: return all polls
      const { data, error } = await getPolls();

      if (error) {
        return NextResponse.json(
          { error: error.message || "Failed to fetch polls" },
          { status: 500 }
        );
      }

      return NextResponse.json({ data }, { status: 200 });
    }

    // Parse pagination parameters
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '20', 10),
      100 // Max 100 items per page
    );
    const offset = Math.max(
      parseInt(searchParams.get('offset') || '0', 10),
      0
    );

    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const filterStatus = searchParams.get('filterStatus') || 'all';

    // Validate parameters
    const validSortBy = ['created_at', 'votes', 'expires_at'];
    const validSortOrder = ['asc', 'desc'];
    const validFilterStatus = ['all', 'active', 'closed'];

    if (!validSortBy.includes(sortBy)) {
      return NextResponse.json(
        { error: `Invalid sortBy. Must be one of: ${validSortBy.join(', ')}` },
        { status: 400 }
      );
    }

    if (!validSortOrder.includes(sortOrder)) {
      return NextResponse.json(
        { error: `Invalid sortOrder. Must be one of: ${validSortOrder.join(', ')}` },
        { status: 400 }
      );
    }

    if (!validFilterStatus.includes(filterStatus)) {
      return NextResponse.json(
        { error: `Invalid filterStatus. Must be one of: ${validFilterStatus.join(', ')}` },
        { status: 400 }
      );
    }

    const params: GetPollsParams = {
      limit,
      offset,
      sortBy: sortBy as GetPollsParams['sortBy'],
      sortOrder: sortOrder as GetPollsParams['sortOrder'],
      filterStatus: filterStatus as GetPollsParams['filterStatus'],
    };

    const { data, error } = await getPollsPaginated(params);

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to fetch polls" },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in GET /api/polls:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/polls
 * 새로운 투표를 생성합니다.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, options, isPublic, expiresAt } = body as CreatePollParams;

    // 클라이언트 측 검증
    if (!question || !question.trim()) {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    if (!options || !Array.isArray(options) || options.length < 2) {
      return NextResponse.json(
        { error: "At least 2 options are required" },
        { status: 400 }
      );
    }

    if (options.some((opt) => !opt || !opt.trim())) {
      return NextResponse.json(
        { error: "All options must be non-empty" },
        { status: 400 }
      );
    }

    const { data: pollId, error } = await createPoll({
      question,
      options,
      isPublic: isPublic ?? true,
      expiresAt: expiresAt || null,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to create poll" },
        { status: 500 }
      );
    }

    return NextResponse.json({ pollId }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error in POST /api/polls:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Next.js 캐싱 설정
export const revalidate = 60; // 60초마다 재검증
export const dynamic = "force-dynamic"; // 항상 동적으로 렌더링
