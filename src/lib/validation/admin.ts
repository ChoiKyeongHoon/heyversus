import { z } from "zod";

export const adminRangeSchema = z.enum(["24h", "7d", "30d", "all"]);

export const reportStatusSchema = z.enum(["open", "resolved", "dismissed", "all"]);

export const reportUpdateSchema = z.object({
  status: z.enum(["open", "resolved", "dismissed"]),
  adminNote: z.string().max(2000).optional(),
});

export const adminPollVisibilitySchema = z.enum(["all", "public", "private"]);

export const adminPollFeaturedFilterSchema = z.enum([
  "all",
  "featured",
  "unfeatured",
]);

export const pollVisibilitySchema = z.object({
  isPublic: z.boolean(),
});

export const pollFeaturedSchema = z.object({
  isFeatured: z.boolean(),
});

const EXTERNAL_HTTP_URL = z
  .string()
  .trim()
  .url()
  .refine(
    (value) => value.startsWith("http://") || value.startsWith("https://"),
    "외부 URL은 http/https 형식이어야 합니다."
  )
  .refine(
    (value) => !value.includes("/storage/v1/object/sign/"),
    "Supabase 서명 URL은 저장할 수 없습니다. 업로드 후 경로(path)를 사용해주세요."
  );

const STORAGE_PATH = z
  .string()
  .trim()
  .min(1, "이미지 경로가 비어 있습니다.")
  .max(2048, "이미지 경로는 최대 2048자까지 가능합니다.")
  .refine(
    (value) => !value.includes("://"),
    "스토리지 경로는 URL이 아닌 path 형식이어야 합니다."
  );

export const pollOptionImageSchema = z.object({
  imageUrl: z.union([EXTERNAL_HTTP_URL, STORAGE_PATH, z.null()]),
});

export const createReportSchema = z.object({
  targetType: z.enum(["poll", "user"]),
  pollId: z.string().uuid().optional(),
  targetUserId: z.string().uuid().optional(),
  reasonCode: z.enum([
    "spam",
    "hate",
    "sexual",
    "violence",
    "harassment",
    "misinfo",
    "other",
  ]),
  reasonDetail: z.string().max(2000).optional(),
});
