import { NextResponse } from "next/server";

import type { AdminGuardError } from "@/lib/admin/guards";
import { requireAdmin } from "@/lib/admin/guards";
import { reportUpdateSchema } from "@/lib/validation/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id?: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Report ID가 필요합니다." }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const parsed = reportUpdateSchema.safeParse(body);

    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ?? "요청 본문이 올바르지 않습니다.";
      return NextResponse.json({ error: message }, { status: 422 });
    }

    const { supabase } = await requireAdmin();

    const { error } = await supabase.rpc("resolve_report", {
      p_report_id: id,
      p_status: parsed.data.status,
      p_admin_note: parsed.data.adminNote ?? null,
    });

    if (error) {
      const message = error.message || "신고 처리에 실패했습니다.";
      const status = message.toLowerCase().includes("admin only") ? 403 : 500;
      return NextResponse.json({ error: message }, { status });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const err = error as AdminGuardError;
    const status = err.status ?? 500;
    return NextResponse.json(
      { error: err.message || "신고 처리 중 오류가 발생했습니다." },
      { status }
    );
  }
}

export const dynamic = "force-dynamic";

