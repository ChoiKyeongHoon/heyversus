import Link from "next/link";

import { PollsHero } from "@/components/polls/PollsHero";
import { Button } from "@/components/ui/button";
import { getLeaderboard } from "@/lib/services/polls";

export const revalidate = 120;

export default async function ScorePage() {
  const { data, error } = await getLeaderboard({ limit: null });

  if (error) {
    console.error("Error fetching profiles:", error);
  }

  const profiles = data ?? [];

  const topThree = profiles.slice(0, 3);

  const topTenAverage =
    profiles.slice(0, 10).reduce((acc, cur) => acc + (cur.points || 0), 0) /
    Math.max(1, Math.min(10, profiles.length));

  const stats = [
    { label: "전체 플레이어", value: profiles.length.toLocaleString() },
    {
      label: "상위 10위 평균",
      value: `${Math.round(topTenAverage).toLocaleString()} XP`,
      helper: "상위 플레이어 평균 포인트",
    },
    {
      label: "이번주 신규 진입",
      value: `${Math.min(3, profiles.length)}명`,
      helper: "주간 신규 상위권",
    },
    {
      label: "1위 포인트",
      value: topThree[0]?.points
        ? `${topThree[0].points.toLocaleString()} XP`
        : "-",
    },
  ];

  return (
    <div className="space-y-6 px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
      <div className="container mx-auto">
        <PollsHero
          stats={stats}
          eyebrowText="Leaderboard"
          titlePrefix="랭킹 보드에서"
          titleHighlight="당신의 위치"
          titleSuffix="를 확인하고 도전하세요."
          description="상위 플레이어의 포인트 변화를 추적하고 목표를 세워보세요."
          primaryAction={{ label: "투표 참여하기", href: "/polls" }}
          secondaryAction={{
            label: "내 즐겨찾기",
            href: "/favorites",
            variant: "outline",
          }}
        />
      </div>

      <div className="container mx-auto space-y-6">
        <section className="rounded-3xl border border-border bg-panel/70 p-6 shadow-inner">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-text-tertiary">
                Leaderboard
              </p>
              <h2 className="text-2xl font-bold text-text-primary">
                상위 플레이어
              </h2>
            </div>
            <div className="flex gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href="/polls">투표 살펴보기</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/create-poll">새 투표 만들기</Link>
              </Button>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {topThree.map((profile, index) => (
              <div
                key={profile.username}
                className="rounded-2xl border border-border bg-background px-4 py-5 text-center shadow"
              >
                <div className="text-sm text-text-secondary">{index + 1}위</div>
                <div className="mt-2 text-2xl font-bold text-text-primary">
                  {profile.username || "-"}
                </div>
                <div className="mt-1 text-xs uppercase tracking-wider text-text-tertiary">
                  {profile.points.toLocaleString()} XP
                </div>
              </div>
            ))}
            {topThree.length === 0 && (
              <div className="col-span-3 rounded-2xl border border-border bg-background px-4 py-6 text-center text-text-secondary">
                아직 랭킹 데이터가 없습니다.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-panel/80 p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold text-text-primary">
            전체 랭킹
          </h3>
          <div className="overflow-hidden rounded-2xl border border-border-subtle bg-background">
            <table className="w-full text-left text-sm">
              <thead className="bg-background-subtle text-text-tertiary">
                <tr>
                  <th className="px-4 py-3 text-center">순위</th>
                  <th className="px-4 py-3">닉네임</th>
                  <th className="px-4 py-3 text-right">포인트</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((profile, index) => (
                  <tr
                    key={`${profile.username}-${index}`}
                    className="border-t border-border-subtle text-text-primary"
                  >
                    <td className="px-4 py-3 text-center font-semibold">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3">{profile.username || "-"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-primary">
                      {profile.points.toLocaleString()} XP
                    </td>
                  </tr>
                ))}
                {profiles.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-6 text-center text-text-secondary"
                    >
                      아직 랭킹 데이터가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
