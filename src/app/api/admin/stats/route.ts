import { NextRequest, NextResponse } from "next/server";

import type { AdminGuardError } from "@/lib/admin/guards";
import { requireAdmin } from "@/lib/admin/guards";
import { adminRangeSchema } from "@/lib/validation/admin";

export async function GET(request: NextRequest) {
  try {
    const rangeParam = request.nextUrl.searchParams.get("range") ?? "7d";
    const parsedRange = adminRangeSchema.safeParse(rangeParam);

    if (!parsedRange.success) {
      return NextResponse.json(
        { error: "range 값이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const { supabase } = await requireAdmin();
    const { data, error } = await supabase.rpc("get_admin_stats", {
      p_range: parsedRange.data,
    });

    if (error) {
      const message = error.message || "지표 조회에 실패했습니다.";
      const status = message.toLowerCase().includes("admin only") ? 403 : 500;
      return NextResponse.json({ error: message }, { status });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    const err = error as AdminGuardError;
    const status = err.status ?? 500;
    return NextResponse.json(
      { error: err.message || "지표 조회 중 오류가 발생했습니다." },
      { status }
    );
  }
}

export const dynamic = "force-dynamic";

