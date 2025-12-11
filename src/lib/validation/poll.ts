import { z } from "zod";

const MAX_OPTIONS = 6;
const MIN_OPTIONS = 2;
const MAX_QUESTION_LENGTH = 200;
const MAX_OPTION_LENGTH = 120;
const MAX_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_IMAGE_PATH_LENGTH = 2048;

const optionSchema = z
  .string()
  .trim()
  .min(1, "선택지는 최소 1자 이상이어야 합니다.")
  .max(MAX_OPTION_LENGTH, `선택지는 최대 ${MAX_OPTION_LENGTH}자까지 가능합니다.`);

export const createPollSchema = z
  .object({
    question: z
      .string()
      .trim()
      .min(3, "질문은 최소 3자 이상이어야 합니다.")
      .max(
        MAX_QUESTION_LENGTH,
        `질문은 최대 ${MAX_QUESTION_LENGTH}자까지 가능합니다.`
      ),
    options: z
      .array(optionSchema)
      .min(MIN_OPTIONS, `선택지는 최소 ${MIN_OPTIONS}개 이상이어야 합니다.`)
      .max(MAX_OPTIONS, `선택지는 최대 ${MAX_OPTIONS}개까지 추가할 수 있습니다.`)
      .transform((opts) => opts.map((opt) => opt.trim()))
      .refine(
        (opts) => new Set(opts).size === opts.length,
        "동일한 선택지를 중복해서 사용할 수 없습니다."
      ),
    isPublic: z.boolean().default(true),
    expiresAt: z
      .union([z.string(), z.null(), z.undefined()])
      .refine(
        (value) =>
          value === null ||
          value === undefined ||
          !Number.isNaN(new Date(value).getTime()),
        "만료 시간이 올바르지 않습니다."
      )
      .transform((value) => {
        if (!value) {
          return null;
        }
        return new Date(value).toISOString();
      })
      .refine(
        (value) =>
          value === null ||
          (typeof value === "string" && new Date(value).getTime() > Date.now()),
        "만료 시간은 현재 시각 이후여야 합니다."
      )
      .refine(
        (value) =>
          value === null ||
          (typeof value === "string" &&
            new Date(value).getTime() <= Date.now() + MAX_EXPIRY_MS),
        "만료 시간은 최대 30일 이내로 설정할 수 있습니다."
      )
      .default(null),
    optionImageUrls: z
      .array(
        z
          .union([
            z
              .string()
              .trim()
              .min(1, "이미지 경로가 비어 있습니다.")
              .max(
                MAX_IMAGE_PATH_LENGTH,
                `이미지 경로는 최대 ${MAX_IMAGE_PATH_LENGTH}자까지 가능합니다.`
              ),
            z.null(),
          ])
      )
      .optional(),
  })
  .superRefine((payload, ctx) => {
    if (
      payload.optionImageUrls &&
      payload.optionImageUrls.length > 0 &&
      payload.optionImageUrls.length !== payload.options.length
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "이미지 경로 개수가 선택지 개수와 일치해야 합니다.",
        path: ["optionImageUrls"],
      });
    }
  })
  .transform((payload) => ({
    ...payload,
    question: payload.question.trim(),
    options: payload.options.map((opt) => opt.trim()),
    optionImageUrls: payload.optionImageUrls?.map((url) => (url ? url.trim() : null)) ?? null,
  }));

export type CreatePollInput = z.input<typeof createPollSchema>;
export type CreatePollPayload = z.infer<typeof createPollSchema>;
