import { createClient } from "@/lib/supabase/server";
import FeaturedPollClient from "./FeaturedPollClient"; // 데이터를 표시할 클라이언트 컴포넌트
import Link from "next/link";

import { PollWithUserStatus } from "@/lib/types";

// 이 페이지는 동적으로 렌더링됩니다.
// export const revalidate = 3600; // cookies()와 함께 사용할 수 없습니다.

async function getFeaturedPolls(): Promise<PollWithUserStatus[]> {
  const supabase = await createClient();
  const { data: polls, error } = await supabase.rpc(
    "get_featured_polls_with_user_status"
  );

  if (error) {
    console.error("Error fetching featured polls:", error);
    return [];
  }
  return polls;
}

export default async function LandingPage() {
  const featuredPolls = await getFeaturedPolls();

  return (
    <div className="container mx-auto p-4">
      <header className="text-center my-8 md:my-12">
        <p className="text-lg md:text-xl text-gray-400 mt-3">
          당신의 선택은? 흥미로운 주제에 투표하고 결과를 확인하세요.
        </p>
      </header>

      <main className="my-10">
        <h2 className="text-2xl md:text-3xl font-semibold mb-6 text-center">
          오늘의 투표
        </h2>
        <FeaturedPollClient polls={featuredPolls} />
      </main>

      <footer className="text-center mt-12 py-6 border-t border-gray-700">
        <p className="text-gray-400">더 많은 투표를 보고 직접 만들어보세요.</p>
        <div className="mt-4 space-x-4">
          <Link
            href="/polls"
            className="px-6 py-2 font-semibold text-blue-600 border border-blue-700 rounded-md hover:bg-blue-50 transition-colors"
          >
            모든 투표 보기
          </Link>
        </div>
        <div className="mt-8 text-sm text-gray-500">
          <p>
            &copy; {new Date().getFullYear()} heyversus. All Rights Reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
