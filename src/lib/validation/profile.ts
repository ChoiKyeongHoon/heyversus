import { z } from "zod";

const USERNAME_REGEX = /^[가-힣a-zA-Z0-9_-]+$/;

/**
 * 프로필 업데이트 요청에 사용되는 Zod 스키마
 * 클라이언트/서버 간 동일한 검증 규칙을 보장합니다.
 */
export const profileUpdateSchema = z.object({
  username: z
    .string({ required_error: "사용자명을 입력해주세요." })
    .trim()
    .min(3, "사용자명은 최소 3자 이상이어야 합니다.")
    .max(30, "사용자명은 최대 30자까지 가능합니다.")
    .regex(
      USERNAME_REGEX,
      "사용자명은 한글, 영문, 숫자, _, - 만 사용 가능합니다."
    ),
  full_name: z
    .string()
    .trim()
    .max(50, "이름은 최대 50자까지 가능합니다.")
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  bio: z
    .string()
    .trim()
    .max(500, "소개는 최대 500자까지 가능합니다.")
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
});

export type ProfileUpdatePayload = z.infer<typeof profileUpdateSchema>;
