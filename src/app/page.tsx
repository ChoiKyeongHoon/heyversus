import Link from "next/link";

import { Button } from "@/components/ui/button";
import { CACHE_TIMES } from "@/constants/cache";
import { getFeaturedPolls } from "@/lib/services/polls";

import FeaturedPollClient from "./FeaturedPollClient"; // 데이터를 표시할 클라이언트 컴포넌트
import { LandingHero } from "./LandingHero";

export const revalidate = CACHE_TIMES.FEATURED_POLLS;

export default async function LandingPage() {
  const { data, error } = await getFeaturedPolls({ useAnonClient: true });

  if (error) {
    console.error("Error fetching featured polls:", error);
  }

  const featuredPolls = data ?? [];
  const heroPoll = featuredPolls[0];
  const heroOption = heroPoll?.poll_options?.[0];
  const heroImageUrl = heroOption?.image_url ?? null;
  const heroImageAlt =
    heroOption?.text || heroPoll?.question || "대표 투표 이미지";

  const totalOptions = featuredPolls.reduce(
    (sum, poll) => sum + poll.poll_options.length,
    0
  );
  const activeCount = featuredPolls.filter(
    (poll) => poll.status !== "closed"
  ).length;
  const closingSoonCount = featuredPolls.filter((poll) => {
    if (!poll.expires_at) {
      return false;
    }
    const expiresIn =
      new Date(poll.expires_at).getTime() - new Date().getTime();
    return expiresIn > 0 && expiresIn < 1000 * 60 * 60 * 24;
  }).length;

  const heroStats = [
    {
      label: "대표 투표",
      value: featuredPolls.length.toLocaleString(),
      helper: "오늘 추천",
    },
    {
      label: "총 선택지",
      value: totalOptions.toLocaleString(),
      helper: "비교 가능한 옵션",
    },
    {
      label: "진행 중",
      value: activeCount.toLocaleString(),
      helper: "지금 참여 가능",
    },
    {
      label: "마감 임박",
      value: closingSoonCount.toLocaleString(),
      helper: "24시간 내 종료",
    },
  ];

  return (
    <div className="container mx-auto px-4 md:px-6 lg:px-8">
      <div className="my-8 md:my-10">
        <LandingHero
          highlightQuestion={
            heroPoll?.question ??
            "실시간으로 집계되는 투표에서 가장 많은 선택을 확인하세요."
          }
          heroImageUrl={heroImageUrl}
          heroImageAlt={heroImageAlt}
        />
      </div>

      <main className="my-10 md:my-12 space-y-6">
        <div className="mb-6 text-center">
          <p className="text-xs uppercase tracking-[0.45em] text-text-tertiary">
            Featured Picks
          </p>
          <h2 className="mt-3 text-xl font-semibold text-text-primary md:text-2xl lg:text-3xl">
            오늘의 투표
          </h2>
          <p className="mt-2 text-sm text-text-secondary md:text-base">
            가장 인기 있는 토픽을 바로 만나보세요.
          </p>
        </div>
        <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {heroStats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-border bg-background/80 px-4 py-3 shadow-sm"
            >
              <p className="text-xs text-text-tertiary">{stat.label}</p>
              <p className="text-2xl font-bold text-text-primary">
                {stat.value}
              </p>
              {stat.helper ? (
                <p className="text-xs text-text-secondary">{stat.helper}</p>
              ) : null}
            </div>
          ))}
        </div>
        <FeaturedPollClient polls={featuredPolls} />
      </main>

      <footer className="border-t border-gray-700 py-4 text-center md:py-6">
        <p className="text-sm text-gray-400 md:text-base">
          더 많은 투표를 보고 직접 만들어보세요.
        </p>
        <div className="mt-4">
          <Button
            asChild
            size="lg"
            className="text-sm font-semibold sm:text-base"
          >
            <Link href="/polls">모든 투표 보기</Link>
          </Button>
        </div>
        <div className="mt-6 text-xs text-gray-500 md:mt-8 md:text-sm">
          <p>&copy; {new Date().getFullYear()} heyversus. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
}
