import { NextResponse } from "next/server";

import { logScoreEvent } from "@/lib/services/scoreEvents";
import { createClient } from "@/lib/supabase/server";
import type { ScoreEventType } from "@/lib/types";

export const dynamic = "force-dynamic";

const ALLOWED_EVENT_TYPES: ScoreEventType[] = [
  "vote",
  "create_poll",
  "favorite",
  "share",
  "streak3",
  "streak7",
];

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | {
          eventType?: ScoreEventType;
          pollId?: string | null;
          weightOverride?: number | null;
          metadata?: Record<string, unknown> | null;
        }
      | null;

    if (!body || !body.eventType || !ALLOWED_EVENT_TYPES.includes(body.eventType)) {
      return NextResponse.json(
        { error: "유효한 eventType이 필요합니다." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "인증이 필요합니다. 다시 로그인해 주세요." },
        { status: 401 }
      );
    }

    const { data, error } = await logScoreEvent(
      {
        eventType: body.eventType,
        pollId: body.pollId ?? null,
        weightOverride: body.weightOverride ?? null,
        metadata: body.metadata ?? null,
        userId: session.user.id,
      },
      { useServiceRole: true }
    );

    if (error) {
      console.error("Error logging score event (API):", error);
      return NextResponse.json(
        {
          error:
            error.message ||
            "점수 이벤트 기록에 실패했습니다. 잠시 후 다시 시도해주세요.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in POST /api/score-events:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
