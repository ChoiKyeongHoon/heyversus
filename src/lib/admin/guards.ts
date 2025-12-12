import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

type AdminGuardErrorCode =
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "DB_SCHEMA_OUTDATED"
  | "INTERNAL";

export type AdminGuardError = Error & {
  status?: number;
  code?: AdminGuardErrorCode;
};

type ProfileRoleRow = { role: string | null };

export async function requireAdmin(): Promise<{
  supabase: SupabaseClient;
  userId: string;
}> {
  const supabase = await createClient();

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    const error = new Error("세션 정보를 확인하지 못했습니다.") as AdminGuardError;
    error.status = 500;
    error.code = "INTERNAL";
    throw error;
  }

  if (!session) {
    const error = new Error("로그인이 필요합니다.") as AdminGuardError;
    error.status = 401;
    error.code = "AUTH_REQUIRED";
    throw error;
  }

  const { data, error: roleError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .maybeSingle();

  if (roleError) {
    const message = roleError.message || "관리자 권한을 확인하지 못했습니다.";
    const lower = message.toLowerCase();
    const isMissingRoleColumn =
      lower.includes("column") &&
      lower.includes("role") &&
      (lower.includes("does not exist") || lower.includes("not exist"));

    const error = new Error(
      isMissingRoleColumn
        ? "DB 스키마가 최신이 아닙니다. Supabase에서 Step 21 SQL을 먼저 실행해 주세요."
        : message
    ) as AdminGuardError;

    error.status = 500;
    error.code = isMissingRoleColumn ? "DB_SCHEMA_OUTDATED" : "INTERNAL";
    throw error;
  }

  const role = (data as ProfileRoleRow | null)?.role ?? "user";

  if (role !== "admin") {
    const error = new Error("관리자 권한이 필요합니다.") as AdminGuardError;
    error.status = 403;
    error.code = "FORBIDDEN";
    throw error;
  }

  return { supabase, userId: session.user.id };
}

