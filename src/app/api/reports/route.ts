import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createReportSchema } from "@/lib/validation/admin";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = createReportSchema.safeParse(body);

    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ?? "요청 본문이 올바르지 않습니다.";
      return NextResponse.json({ error: message }, { status: 422 });
    }

    if (parsed.data.targetType === "poll" && !parsed.data.pollId) {
      return NextResponse.json(
        { error: "pollId가 필요합니다." },
        { status: 422 }
      );
    }

    if (parsed.data.targetType === "user" && !parsed.data.targetUserId) {
      return NextResponse.json(
        { error: "targetUserId가 필요합니다." },
        { status: 422 }
      );
    }

    const { data: reportId, error } = await supabase.rpc("create_report", {
      p_target_type: parsed.data.targetType,
      p_poll_id: parsed.data.targetType === "poll" ? parsed.data.pollId : null,
      p_target_user_id:
        parsed.data.targetType === "user" ? parsed.data.targetUserId : null,
      p_reason_code: parsed.data.reasonCode,
      p_reason_detail: parsed.data.reasonDetail ?? null,
    });

    if (error) {
      const message = error.message || "신고 생성에 실패했습니다.";
      const status = message.toLowerCase().includes("authentication") ? 401 : 500;
      return NextResponse.json({ error: message }, { status });
    }

    return NextResponse.json({ data: reportId }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in POST /api/reports:", error);
    return NextResponse.json(
      { error: "신고 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";

