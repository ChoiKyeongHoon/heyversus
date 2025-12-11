import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getServiceRoleClient } from "@/lib/supabase/service-role";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const DOWNLOAD_URL_TTL_SECONDS = 300; // 5분

function getExtension(fileName: string, fileType: string) {
  const mimeExt: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  const fromMime = mimeExt[fileType];
  if (fromMime) return fromMime;

  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop() || "bin" : "bin";
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다. 다시 로그인해 주세요." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    const fileName = body?.fileName;
    const fileType = body?.fileType;
    const fileSize = body?.fileSize;

    if (
      !fileName ||
      typeof fileName !== "string" ||
      !fileType ||
      typeof fileType !== "string" ||
      typeof fileSize !== "number"
    ) {
      return NextResponse.json(
        { error: "파일 정보가 올바르지 않습니다." },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.has(fileType)) {
      return NextResponse.json(
        { error: "JPEG, PNG, WebP 형식만 업로드할 수 있습니다." },
        { status: 400 }
      );
    }

    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "파일 크기는 10MB 이하여야 합니다." },
        { status: 400 }
      );
    }

    const objectPath = `${user.id}/poll-options/${randomUUID()}.${getExtension(
      fileName,
      fileType
    )}`;

    const serviceClient = getServiceRoleClient();
    const { data, error } = await serviceClient.storage
      .from("poll_images")
      .createSignedUploadUrl(objectPath);

    if (error || !data) {
      console.error("Failed to create signed upload URL:", error);
      return NextResponse.json(
        { error: "이미지 업로드 URL을 생성하지 못했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        bucket: "poll_images",
        path: data.path,
        token: data.token,
        signedUrl: data.signedUrl,
        downloadUrlTtl: DOWNLOAD_URL_TTL_SECONDS,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error in POST /api/polls/images:", error);
    return NextResponse.json(
      { error: "서명 URL 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "로그인이 필요합니다. 다시 로그인해 주세요." },
        { status: 401 }
      );
    }

    const path = request.nextUrl.searchParams.get("path");

    if (!path) {
      return NextResponse.json(
        { error: "삭제할 파일 경로가 필요합니다." },
        { status: 400 }
      );
    }

    if (!path.startsWith(`${user.id}/`)) {
      return NextResponse.json(
        { error: "본인이 업로드한 이미지 경로만 삭제할 수 있습니다." },
        { status: 403 }
      );
    }

    const serviceClient = getServiceRoleClient();
    const { error } = await serviceClient.storage
      .from("poll_images")
      .remove([path]);

    if (error) {
      console.error("Failed to delete poll image:", error);
      return NextResponse.json(
        { error: "이미지 삭제 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in DELETE /api/polls/images:", error);
    return NextResponse.json(
      { error: "이미지 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export const dynamic = "force-dynamic";
