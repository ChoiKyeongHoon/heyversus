import type { PostgrestError } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import {
  createPoll,
  getPolls,
  getPollsPaginated,
} from "@/lib/services/polls";
import { logScoreEvent } from "@/lib/services/scoreEvents";
import { createClient } from "@/lib/supabase/server";
import type { GetPollsParams } from "@/lib/types";
import {
  type CreatePollPayload,
  createPollSchema,
} from "@/lib/validation/poll";

const SUPABASE_VALIDATION_CODES = new Set([
  "23505", // unique_violation
  "23514", // check_violation
  "22P02", // invalid_text_representation
  "22007", // invalid_datetime_format
  "PGRST302", // badly formed request
  "PGRST303", // routing error / invalid input
]);

function mapPollCreationError(error: unknown) {
  if (!error || !(error instanceof Error)) {
    return {
      status: 500,
      message: "투표 생성 중 알 수 없는 오류가 발생했습니다.",
    };
  }

  const postgrestError = error as PostgrestError;
  const message =
    error.message || "투표 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
  const normalized = message.toLowerCase();
  const code = postgrestError.code || (error as { code?: string }).code;

  if (code === "AUTH_REQUIRED" || normalized.includes("not authenticated")) {
    return { status: 401, message: "로그인이 필요합니다. 다시 로그인해 주세요." };
  }

  if (normalized.includes("jwt") || normalized.includes("token is expired")) {
    return { status: 401, message: "세션이 만료되었습니다. 다시 로그인해 주세요." };
  }

  if (normalized.includes("permission denied") || code === "42501") {
    return {
      status: 403,
      message: "이 작업을 수행할 권한이 없습니다.",
    };
  }

  if (code && SUPABASE_VALIDATION_CODES.has(code)) {
    return { status: 422, message };
  }

  if (normalized.includes("violates") || normalized.includes("invalid")) {
    return { status: 422, message };
  }

  return {
    status: 500,
    message: "투표 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
  };
}

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
    const parsed = createPollSchema.safeParse(body);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json(
        {
          error: issue?.message ?? "입력값이 올바르지 않습니다.",
          details: parsed.error.flatten(),
        },
        { status: 422 }
      );
    }

    const payload: CreatePollPayload = parsed.data;

    const supabase = await createClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const { data: pollId, error } = await createPoll({
      question: payload.question,
      options: payload.options,
      isPublic: payload.isPublic ?? true,
      expiresAt: payload.expiresAt ?? null,
      maxVoters: payload.maxVoters ?? null,
      optionImageUrls: payload.optionImageUrls ?? null,
    });

    if (error) {
      const { status, message } = mapPollCreationError(error);
      return NextResponse.json(
        { error: message },
        { status }
      );
    }

    const { error: scoreEventError } = await logScoreEvent(
      { eventType: "create_poll", userId: session?.user?.id ?? null },
      { useServiceRole: true }
    );

    if (scoreEventError) {
      console.error("Failed to log create_poll score event:", scoreEventError);
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

export const dynamic = "force-dynamic"; // 항상 동적으로 렌더링
