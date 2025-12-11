/**
 * 데이터 시딩 스크립트
 *
 * Supabase 데이터베이스에 샘플 투표 데이터를 생성합니다.
 * 로컬 개발 및 테스트 환경에서 사용하기 위한 스크립트입니다.
 *
 * 사용법: npm run db:seed
 */

import { createClient } from "@supabase/supabase-js";

// 환경 변수 확인
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Error: Supabase 환경 변수가 설정되지 않았습니다.");
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 .env.local에 설정해주세요."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 샘플 투표 데이터
const samplePolls = [
  {
    question: "가장 좋아하는 프로그래밍 언어는?",
    options: ["TypeScript", "Python", "Rust", "Go"],
    isPublic: true,
    expiresAt: null, // 영구 투표
  },
  {
    question: "다음 주말에 하고 싶은 활동은?",
    options: ["영화 보기", "등산", "독서", "게임"],
    isPublic: true,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7일 후
  },
  {
    question: "선호하는 개발 환경은?",
    options: ["VS Code", "IntelliJ", "Vim", "기타"],
    isPublic: true,
    expiresAt: null,
  },
  {
    question: "점심 메뉴 추천",
    options: ["한식", "중식", "일식", "양식", "분식"],
    isPublic: true,
    expiresAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // 1일 후
  },
  {
    question: "가장 좋아하는 음악 장르는?",
    options: ["K-POP", "힙합", "록", "재즈", "클래식"],
    isPublic: true,
    expiresAt: null,
  },
];

async function seed() {
  console.log("🌱 데이터 시딩 시작...\n");

  try {
    // 1. 로그인 확인 (선택 사항)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.log("⚠️  경고: 로그인된 사용자가 없습니다.");
      console.log(
        "   투표는 생성되지만 created_by가 null로 설정됩니다.\n"
      );
    } else {
      console.log(`✓ 로그인된 사용자: ${user.email}\n`);
    }

    // 2. 샘플 투표 생성
    for (const poll of samplePolls) {
      console.log(`📊 투표 생성 중: "${poll.question}"`);

      const { data: pollId, error } = await supabase.rpc("create_new_poll", {
        question_text: poll.question,
        option_texts: poll.options,
        is_public: poll.isPublic,
        expires_at_param: poll.expiresAt,
      });

      if (error) {
        console.error(`   ❌ 오류:`, error.message);
        continue;
      }

      console.log(`   ✓ 생성 완료 (ID: ${pollId})`);
      console.log(`   옵션: ${poll.options.join(", ")}`);
      console.log(
        `   만료: ${poll.expiresAt ? new Date(poll.expiresAt).toLocaleString() : "없음"}\n`
      );
    }

    console.log("✅ 시딩 완료!");
    console.log(
      `총 ${samplePolls.length}개의 투표가 생성되었습니다.\n`
    );

    // 3. 생성된 투표 확인
    console.log("📋 생성된 투표 목록 확인 중...\n");
    const { data: polls, error: fetchError } = await supabase.rpc(
      "get_polls_with_user_status"
    );

    if (fetchError) {
      console.error("❌ 투표 목록 조회 오류:", fetchError.message);
    } else {
      console.log(`총 ${polls?.length || 0}개의 공개 투표가 존재합니다.`);
    }
  } catch (error) {
    console.error("❌ 시딩 중 예상치 못한 오류 발생:", error);
    process.exit(1);
  }
}

// 스크립트 실행
seed();
