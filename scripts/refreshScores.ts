/**
 * 점수 집계 배치 스크립트
 *
 * refresh_profile_scores RPC를 호출해 profile_scores 테이블을 갱신합니다.
 * service role 키가 필요하므로 서버/CI/스케줄러에서만 실행하세요.
 *
 * 사용 예:
 *   SCORE_REFRESH_LIMIT=1000 SCORE_REFRESH_OFFSET=0 ts-node scripts/refreshScores.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const limit = Number(process.env.SCORE_REFRESH_LIMIT ?? "500");
const offset = Number(process.env.SCORE_REFRESH_OFFSET ?? "0");

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "❌ Supabase 서비스 환경 변수가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY를 확인하세요."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log(
    `🔄 refresh_profile_scores 실행 (limit=${limit}, offset=${offset})`
  );

  const { error } = await supabase.rpc("refresh_profile_scores", {
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    console.error("❌ 점수 집계 실패:", error);
    process.exit(1);
  }

  console.log("✅ 점수 집계 완료");
}

main().catch((error) => {
  console.error("❌ 예상치 못한 오류:", error);
  process.exit(1);
});
