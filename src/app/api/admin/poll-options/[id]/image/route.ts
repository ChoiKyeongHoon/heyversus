import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { CACHE_TAGS } from "@/constants/cache";
import type { AdminGuardError } from "@/lib/admin/guards";
import { requireAdmin } from "@/lib/admin/guards";
import { getServiceRoleClient } from "@/lib/supabase/service-role";
import { pollOptionImageSchema } from "@/lib/validation/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id?: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Option ID가 필요합니다." },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = pollOptionImageSchema.safeParse(body);

    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ?? "요청 본문이 올바르지 않습니다.";
      return NextResponse.json({ error: message }, { status: 422 });
    }

    const { userId } = await requireAdmin();
    const serviceClient = getServiceRoleClient();

    const { data: option, error: optionError } = await serviceClient
      .from("poll_options")
      .select("id, poll_id")
      .eq("id", id)
      .maybeSingle();

    if (optionError) {
      return NextResponse.json(
        { error: optionError.message || "선택지를 확인하지 못했습니다." },
        { status: 500 }
      );
    }

    if (!option) {
      return NextResponse.json(
        { error: "선택지를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const pollId = option.poll_id as string;

    if (parsed.data.imageUrl === null) {
      const { data: poll, error: pollError } = await serviceClient
        .from("polls")
        .select("is_featured")
        .eq("id", pollId)
        .maybeSingle();

      if (pollError) {
        return NextResponse.json(
          { error: pollError.message || "투표 정보를 확인하지 못했습니다." },
          { status: 500 }
        );
      }

      if (poll?.is_featured) {
        return NextResponse.json(
          {
            error:
              "대표 투표는 선택지 이미지를 제거할 수 없습니다. 먼저 대표 해제 후 진행해 주세요.",
          },
          { status: 409 }
        );
      }
    }

    const { error: updateError } = await serviceClient
      .from("poll_options")
      .update({ image_url: parsed.data.imageUrl })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || "선택지 이미지 변경에 실패했습니다." },
        { status: 500 }
      );
    }

    await serviceClient.from("admin_audit_logs").insert({
      actor_user_id: userId,
      action: "admin_set_poll_option_image",
      target_type: "poll_option",
      target_id: id,
      payload: { image_url: parsed.data.imageUrl, poll_id: pollId },
    });

    revalidateTag(CACHE_TAGS.FEATURED_POLLS);
    revalidateTag(CACHE_TAGS.POLLS);
    revalidateTag(CACHE_TAGS.POLL(pollId));

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

