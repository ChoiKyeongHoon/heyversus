import { NextRequest, NextResponse } from "next/server";

import { getPollById } from "@/lib/services/polls";

/**
 * GET /api/polls/[id]
 * 특정 ID의 투표를 조회합니다.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id?: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Poll ID is required" },
        { status: 400 }
      );
    }

    const { data, error } = await getPollById(id);

    if (error) {
      const message = error.message || "Failed to fetch poll";
      const normalized = message.toLowerCase();
      const status = normalized.includes("permission denied") ? 403 : 500;
      return NextResponse.json(
        { error: message },
        { status }
      );
    }

    if (!data) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in GET /api/polls/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic"; // 항상 동적으로 렌더링
