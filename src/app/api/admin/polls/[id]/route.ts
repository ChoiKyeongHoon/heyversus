import { NextResponse } from "next/server";

import type { AdminGuardError } from "@/lib/admin/guards";
import { requireAdmin } from "@/lib/admin/guards";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id?: string }> }
) {
  void request;
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Poll ID가 필요합니다." }, { status: 400 });
    }

    const { supabase } = await requireAdmin();

    const { error } = await supabase.rpc("admin_delete_poll", {
      p_poll_id: id,
    });

    if (error) {
      const message = error.message || "투표 삭제에 실패했습니다.";
      const status = message.toLowerCase().includes("admin only") ? 403 : 500;
      return NextResponse.json({ error: message }, { status });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const err = error as AdminGuardError;
    const status = err.status ?? 500;
    return NextResponse.json(
      { error: err.message || "요청 중 오류가 발생했습니다." },
      { status }
    );
  }
}

export const dynamic = "force-dynamic";

