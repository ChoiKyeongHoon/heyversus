import { NextRequest, NextResponse } from "next/server";

import type { AdminGuardError } from "@/lib/admin/guards";
import { requireAdmin } from "@/lib/admin/guards";
import { reportStatusSchema } from "@/lib/validation/admin";

export async function GET(request: NextRequest) {
  try {
    const statusParam = request.nextUrl.searchParams.get("status") ?? "open";
    const parsedStatus = reportStatusSchema.safeParse(statusParam);

    if (!parsedStatus.success) {
      return NextResponse.json(
        { error: "status 값이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const limitParam = request.nextUrl.searchParams.get("limit") ?? "50";
    const offsetParam = request.nextUrl.searchParams.get("offset") ?? "0";
    const limit = Math.min(Math.max(Number.parseInt(limitParam, 10) || 50, 1), 200);
    const offset = Math.max(Number.parseInt(offsetParam, 10) || 0, 0);

    const { supabase } = await requireAdmin();
    const { data, error } = await supabase.rpc("get_reports_admin", {
      p_status: parsedStatus.data,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      const message = error.message || "신고 목록 조회에 실패했습니다.";
      const status = message.toLowerCase().includes("admin only") ? 403 : 500;
      return NextResponse.json({ error: message }, { status });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    const err = error as AdminGuardError;
    const status = err.status ?? 500;
    return NextResponse.json(
      { error: err.message || "신고 목록 조회 중 오류가 발생했습니다." },
      { status }
    );
  }
}

export const dynamic = "force-dynamic";

