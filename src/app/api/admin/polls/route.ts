import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import type { AdminGuardError } from "@/lib/admin/guards";
import { requireAdmin } from "@/lib/admin/guards";
import { getServiceRoleClient } from "@/lib/supabase/service-role";
import {
  adminPollFeaturedFilterSchema,
  adminPollVisibilitySchema,
} from "@/lib/validation/admin";

const POLL_IMAGE_BUCKET = "poll_images";
const SIGNED_URL_TTL_SECONDS = 300; // 5분
const EXTERNAL_URL_REGEX = /^https?:\/\//i;

function isExternalUrl(url: string | null) {
  return Boolean(url && EXTERNAL_URL_REGEX.test(url));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const qParam = request.nextUrl.searchParams.get("q");
    const q = qParam?.trim() ? qParam.trim() : null;

    const visibilityParam = request.nextUrl.searchParams.get("visibility") ?? "all";
    const featuredParam = request.nextUrl.searchParams.get("featured") ?? "all";

    const parsedVisibility = adminPollVisibilitySchema.safeParse(visibilityParam);
    if (!parsedVisibility.success) {
      return NextResponse.json(
        { error: "visibility 값이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const parsedFeatured = adminPollFeaturedFilterSchema.safeParse(featuredParam);
    if (!parsedFeatured.success) {
      return NextResponse.json(
        { error: "featured 값이 올바르지 않습니다." },
        { status: 400 }
      );
    }

    const limitParam = request.nextUrl.searchParams.get("limit") ?? "20";
    const offsetParam = request.nextUrl.searchParams.get("offset") ?? "0";
    const limit = clamp(Number.parseInt(limitParam, 10) || 20, 1, 100);
    const offset = Math.max(Number.parseInt(offsetParam, 10) || 0, 0);

    const serviceClient = getServiceRoleClient();

    const selectFields = [
      "id",
      "question",
      "created_at",
      "created_by",
      "is_public",
      "is_featured",
      "expires_at",
      "status",
      "poll_options(id, text, image_url, position)",
    ].join(", ");

    let query = serviceClient
      .from("polls")
      .select(selectFields, { count: "exact" })
      .order("created_at", { ascending: false });

    query = query.order("position", { foreignTable: "poll_options", ascending: true });

    if (parsedVisibility.data === "public") {
      query = query.eq("is_public", true);
    } else if (parsedVisibility.data === "private") {
      query = query.eq("is_public", false);
    }

    if (parsedFeatured.data === "featured") {
      query = query.eq("is_featured", true);
    } else if (parsedFeatured.data === "unfeatured") {
      query = query.eq("is_featured", false);
    }

    if (q) {
      const isUuid = z.string().uuid().safeParse(q).success;
      query = isUuid ? query.eq("id", q) : query.ilike("question", `%${q}%`);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json(
        { error: error.message || "투표 목록 조회에 실패했습니다." },
        { status: 500 }
      );
    }

    const rows =
      (data as Array<{
        id: string;
        question: string | null;
        created_at: string;
        created_by: string | null;
        is_public: boolean | null;
        is_featured: boolean | null;
        expires_at: string | null;
        status: string | null;
        poll_options:
          | Array<{
              id: string;
              text: string | null;
              image_url: string | null;
              position: number | null;
            }>
          | null;
      }> | null) ?? [];

    const imagePaths = Array.from(
      new Set(
        rows.flatMap((row) =>
          (row.poll_options ?? [])
            .map((option) => option.image_url)
            .filter((value): value is string => Boolean(value) && !isExternalUrl(value))
        )
      )
    );

    const signedMap = new Map<string, string | null>();

    if (imagePaths.length > 0) {
      const { data: signedData, error: signedError } = await serviceClient.storage
        .from(POLL_IMAGE_BUCKET)
        .createSignedUrls(imagePaths, SIGNED_URL_TTL_SECONDS);

      if (!signedError && signedData) {
        signedData.forEach((item, index) => {
          const url = (item as { signedUrl?: string | null; signedURL?: string | null })
            .signedUrl ?? (item as { signedURL?: string | null }).signedURL ?? null;
          signedMap.set(imagePaths[index], url);
        });
      }
    }

    const payload = rows.map((row) => {
      const options = (row.poll_options ?? []).map((option) => {
        const raw = option.image_url;
        const preview =
          raw && !isExternalUrl(raw) ? signedMap.get(raw) ?? null : raw;

        const hasImage = Boolean(raw && raw.trim());

        return {
          id: option.id,
          text: option.text,
          position: option.position ?? 0,
          imageUrl: raw,
          imagePreviewUrl: preview,
          hasImage,
        };
      });

      const optionCount = options.length;
      const optionsWithImagesCount = options.filter((option) => option.hasImage).length;
      const allOptionsHaveImages =
        optionCount > 0 && optionsWithImagesCount === optionCount;

      return {
        id: row.id,
        question: row.question,
        createdAt: row.created_at,
        createdBy: row.created_by,
        isPublic: Boolean(row.is_public),
        isFeatured: Boolean(row.is_featured),
        status: row.status,
        expiresAt: row.expires_at,
        options,
        optionCount,
        optionsWithImagesCount,
        allOptionsHaveImages,
      };
    });

    const total = count ?? 0;
    const hasNextPage = offset + limit < total;
    const nextOffset = hasNextPage ? offset + limit : null;

    return NextResponse.json(
      {
        data: payload,
        pagination: {
          total,
          limit,
          offset,
          hasNextPage,
          nextOffset,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const err = error as AdminGuardError;
    const status = err.status ?? 500;
    return NextResponse.json(
      { error: err.message || "투표 목록 조회 중 오류가 발생했습니다." },
      { status }
    );
  }
}

export const dynamic = "force-dynamic";
