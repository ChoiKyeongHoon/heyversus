import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 투표가 만료되었는지 확인합니다.
 * @param expiresAt - 만료 시간 (ISO 8601 문자열 또는 null)
 * @returns 만료되었으면 true, 아니면 false. null이면 영구 투표로 간주하여 false 반환
 */
export function isPollExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false; // null이면 영구 투표로 간주
  return new Date(expiresAt) < new Date();
}

/**
 * 투표 만료 시간을 한국어 형식으로 포맷합니다.
 * @param expiresAt - 만료 시간 (ISO 8601 문자열 또는 null)
 * @returns 포맷된 날짜 문자열. null이면 "기한 없음" 반환
 */
export function formatExpiryDate(expiresAt: string | null): string {
  if (!expiresAt) return "기한 없음";
  return new Date(expiresAt).toLocaleString();
}
