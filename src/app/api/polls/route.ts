import { NextRequest, NextResponse } from "next/server";

import { createPoll, type CreatePollParams,getPolls } from "@/lib/services/polls";

/**
 * GET /api/polls
 * 모든 공개 투표 목록을 조회합니다.
 */
export async function GET() {
  try {
    const { data, error } = await getPolls();

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to fetch polls" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 200 });
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
