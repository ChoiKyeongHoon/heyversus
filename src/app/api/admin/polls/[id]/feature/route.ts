import { NextResponse } from "next/server";

import type { AdminGuardError } from "@/lib/admin/guards";
import { requireAdmin } from "@/lib/admin/guards";
import { pollFeaturedSchema } from "@/lib/validation/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id?: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Poll ID가 필요합니다." }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const parsed = pollFeaturedSchema.safeParse(body);

    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ?? "요청 본문이 올바르지 않습니다.";
      return NextResponse.json({ error: message }, { status: 422 });
    }

    const { supabase } = await requireAdmin();

    const { error } = await supabase.rpc("admin_set_featured", {
      p_poll_id: id,
      p_is_featured: parsed.data.isFeatured,
    });

    if (error) {
      const message = error.message || "대표 설정 변경에 실패했습니다.";
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

