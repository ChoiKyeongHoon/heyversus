import { NextRequest, NextResponse } from "next/server";
import { voteOnPoll } from "@/lib/services/polls";
import { revalidatePath } from "next/cache";

/**
 * POST /api/polls/[id]/vote
 * 투표에 참여합니다.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pollId } = await params;
    const body = await request.json();
    const { optionId } = body;

    if (!pollId) {
      return NextResponse.json(
        { error: "Poll ID is required" },
        { status: 400 }
      );
    }

    if (!optionId) {
      return NextResponse.json(
        { error: "Option ID is required" },
        { status: 400 }
      );
    }

    const { error } = await voteOnPoll({ optionId, pollId });

    if (error) {
      // 중복 투표 또는 마감된 투표 등의 에러
      return NextResponse.json(
        { error: error.message || "Failed to vote" },
        { status: 400 }
      );
    }

    // 투표 성공 후 관련 페이지 재검증
    revalidatePath(`/poll/${pollId}`);
    revalidatePath("/polls");
    revalidatePath("/");

    return NextResponse.json(
      { message: "Vote recorded successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error in POST /api/polls/[id]/vote:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Next.js 캐싱 설정
export const dynamic = "force-dynamic"; // 항상 동적으로 렌더링
