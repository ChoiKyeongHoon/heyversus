import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { PollWithUserStatus } from "@/lib/types";

import FeaturedPollClient from "./FeaturedPollClient"; // 데이터를 표시할 클라이언트 컴포넌트

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
    <div className="container mx-auto px-4 md:px-6 lg:px-8">
      <header className="text-center my-6 md:my-8 lg:my-12">
        <p className="text-sm md:text-base lg:text-lg text-gray-400 mt-3 px-4">
          당신의 선택은? 흥미로운 주제에 투표하고 결과를 확인하세요.
        </p>
      </header>

      <main className="my-8 md:my-10">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-semibold mb-4 md:mb-6 text-center px-4">
          오늘의 투표
        </h2>
        <FeaturedPollClient polls={featuredPolls} />
      </main>

      <footer className="text-center mt-8 md:mt-12 py-4 md:py-6 border-t border-gray-700">
        <p className="text-sm md:text-base text-gray-400 px-4">더 많은 투표를 보고 직접 만들어보세요.</p>
        <div className="mt-4">
          <Link
            href="/polls"
            className="inline-block px-4 md:px-6 py-2 md:py-2.5 font-semibold text-sm md:text-base text-blue-600 border border-blue-700 rounded-md hover:bg-blue-50 transition-colors min-h-[44px] flex items-center justify-center"
          >
            모든 투표 보기
          </Link>
        </div>
        <div className="mt-6 md:mt-8 text-xs md:text-sm text-gray-500 px-4">
          <p>
            &copy; {new Date().getFullYear()} heyversus. All Rights Reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
