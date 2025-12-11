import { NextResponse } from "next/server";

import {
  deleteAvatar,
  updateProfile,
  uploadAvatar,
} from "@/lib/services/profile";
import { createClient } from "@/lib/supabase/server";
import { profileUpdateSchema } from "@/lib/validation/profile";

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: "로그인이 필요합니다. 다시 로그인해 주세요." },
        { status: 401 }
      );
    }

    const formData = await request.formData();

    const rawUsername = formData.get("username");
    const rawFullName = formData.get("full_name");
    const rawBio = formData.get("bio");

    if (typeof rawUsername !== "string") {
      return NextResponse.json(
        { error: "사용자명은 필수 항목입니다." },
        { status: 422 }
      );
    }

    const parsed = profileUpdateSchema.safeParse({
      username: rawUsername,
      full_name: typeof rawFullName === "string" ? rawFullName : undefined,
      bio: typeof rawBio === "string" ? rawBio : undefined,
    });

    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message ?? "프로필 입력값을 확인해주세요.";
      return NextResponse.json({ error: message }, { status: 422 });
    }

    const payload = parsed.data;
    const currentAvatarEntry = formData.get("current_avatar_url");
    const currentAvatarUrl =
      typeof currentAvatarEntry === "string" && currentAvatarEntry.length > 0
        ? currentAvatarEntry
        : null;

    const avatarEntry = formData.get("avatar");
    const hasNewAvatar = avatarEntry instanceof File && avatarEntry.size > 0;

    let uploadedAvatar: { url: string; path: string } | null = null;

    if (hasNewAvatar) {
      const { data, error } = await uploadAvatar(avatarEntry);

      if (error || !data) {
        return NextResponse.json(
          { error: error?.message ?? "아바타 업로드에 실패했습니다." },
          { status: 422 }
        );
      }

      uploadedAvatar = data;
    }

    const { data: updatedProfile, error: updateError } = await updateProfile({
      username: payload.username,
      full_name: payload.full_name ?? null,
      bio: payload.bio ?? null,
      avatar_url: uploadedAvatar ? uploadedAvatar.url : undefined,
    });

    if (updateError || !updatedProfile) {
      if (uploadedAvatar) {
        await deleteAvatar(uploadedAvatar.path);
      }

      const message =
        updateError?.message ?? "프로필 업데이트에 실패했습니다.";
      const lower = message.toLowerCase();
      const status = lower.includes("not authenticated") ? 401 : 500;

      return NextResponse.json({ error: message }, { status });
    }

    let warning: string | null = null;

    if (uploadedAvatar && currentAvatarUrl) {
      const { error: deleteError } = await deleteAvatar(currentAvatarUrl);
      if (deleteError) {
        warning =
          "이전 프로필 이미지를 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.";
      }
    }

    return NextResponse.json(
      {
        data: updatedProfile,
        warning,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error updating profile:", error);
    return NextResponse.json(
      { error: "프로필 업데이트 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
