import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { CACHE_TAGS } from "@/constants/cache";
import type { AdminGuardError } from "@/lib/admin/guards";
import { requireAdmin } from "@/lib/admin/guards";
import { getServiceRoleClient } from "@/lib/supabase/service-role";
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

    if (parsed.data.isFeatured) {
      const serviceClient = getServiceRoleClient();
      const { data: options, error: optionsError } = await serviceClient
        .from("poll_options")
        .select("id, image_url")
        .eq("poll_id", id);

      if (optionsError) {
        return NextResponse.json(
          { error: optionsError.message || "선택지 이미지를 확인하지 못했습니다." },
          { status: 500 }
        );
      }

      const rows = options ?? [];
      const hasMissingImage = rows.some(
        (option) => !option.image_url || !option.image_url.trim()
      );

      if (rows.length === 0 || hasMissingImage) {
        return NextResponse.json(
          { error: "모든 선택지에 이미지가 있어야 대표 투표로 지정할 수 있습니다. 먼저 누락된 선택지 이미지를 설정해 주세요." },
          { status: 422 }
        );
      }
    }

    const { error } = await supabase.rpc("admin_set_featured", {
      p_poll_id: id,
      p_is_featured: parsed.data.isFeatured,
    });

    if (error) {
      const message = error.message || "대표 설정 변경에 실패했습니다.";
      const status = message.toLowerCase().includes("admin only") ? 403 : 500;
      return NextResponse.json({ error: message }, { status });
    }

    revalidateTag(CACHE_TAGS.FEATURED_POLLS);
    revalidateTag(CACHE_TAGS.POLLS);
    revalidateTag(CACHE_TAGS.POLL(id));

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
