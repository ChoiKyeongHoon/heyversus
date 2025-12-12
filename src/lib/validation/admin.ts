import { z } from "zod";

export const adminRangeSchema = z.enum(["24h", "7d", "30d", "all"]);

export const reportStatusSchema = z.enum(["open", "resolved", "dismissed", "all"]);

export const reportUpdateSchema = z.object({
  status: z.enum(["open", "resolved", "dismissed"]),
  adminNote: z.string().max(2000).optional(),
});

export const pollVisibilitySchema = z.object({
  isPublic: z.boolean(),
});

export const pollFeaturedSchema = z.object({
  isFeatured: z.boolean(),
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

