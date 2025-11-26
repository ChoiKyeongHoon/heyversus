"use client";

import { useMemo, useState } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { PollCard } from "@/components/polls/PollCard";
import { useToggleFavorite } from "@/hooks/useToggleFavorite";
import { useVoteStatus } from "@/hooks/useVoteStatus";
import { getToast } from "@/lib/toast";
import type { PollWithOptions } from "@/lib/types";
import { isPollExpired } from "@/lib/utils";

type FavoritesClientProps = {
  serverPolls: PollWithOptions[];
};

const getTimeRemaining = (expiresAt: string | null): string => {
  if (!expiresAt) return "";
  const now = new Date();
  const expiryDate = new Date(expiresAt);
  const diff = expiryDate.getTime() - now.getTime();

  if (diff <= 0) return "마감됨";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 0) return `${days}일 남음`;

  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours > 0) return `${hours}시간 남음`;

  const minutes = Math.floor(diff / (1000 * 60));
  return `${minutes}분 남음`;
};

export default function FavoritesClient({ serverPolls }: FavoritesClientProps) {
  const [polls, setPolls] = useState(serverPolls);
  const serverVotedIds = useMemo(
    () => polls.filter((p) => p.has_voted).map((p) => p.id),
    [polls]
  );
  const { session, hasVoted } = useVoteStatus(serverVotedIds);
  const toggleFavoriteMutation = useToggleFavorite();
  const [favoritePendingId, setFavoritePendingId] = useState<string | null>(null);

  const handleToggleFavorite = async (pollId: string) => {
    const toast = await getToast();
    if (!session) {
      toast.error("즐겨찾기는 로그인 후 이용할 수 있습니다.");
      return;
    }

    setFavoritePendingId(pollId);
    toggleFavoriteMutation.mutate(
      { pollId },
      {
        onSuccess: async ({ isFavorited }) => {
          setPolls((prev) =>
            isFavorited
              ? prev
              : prev.filter((poll) => poll.id !== pollId)
          );
          const toastInstance = await getToast();
          toastInstance.success(
            isFavorited
              ? "즐겨찾기에 추가했습니다."
              : "즐겨찾기에서 제거했습니다."
          );
        },
        onError: async () => {
          const toastInstance = await getToast();
          toastInstance.error("즐겨찾기 처리 중 오류가 발생했습니다.");
        },
        onSettled: () => setFavoritePendingId(null),
      }
    );
  };

  if (polls.length === 0) {
    return (
      <div className="container mx-auto px-4 py-10 md:px-6 lg:px-8">
        <EmptyState
          title="즐겨찾기한 투표가 없습니다"
          message="관심 있는 투표를 즐겨찾기에 추가해보세요."
          actionLabel="투표 둘러보기"
          actionHref="/polls"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
      <div className="container mx-auto space-y-4">
        <header className="rounded-3xl border border-border bg-panel/60 p-5 shadow-inner">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-text-tertiary">
                My Favorites
              </p>
              <h1 className="text-2xl font-bold text-text-primary md:text-3xl">
                내가 찜한 투표
              </h1>
              <p className="text-sm text-text-secondary md:text-base">
                투표/즐겨찾기 상태를 한눈에 보고, 상세 페이지에서 바로 참여하세요.
              </p>
            </div>
            <div className="text-sm text-text-tertiary">
              총 {polls.length.toLocaleString()}개
            </div>
          </div>
        </header>

        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border/60 bg-background-subtle px-4 py-4 text-sm text-text-secondary sm:flex-row sm:justify-center">
          <span className="text-center">다른 투표 찜하러 가기</span>
          <button
            type="button"
            className="text-primary underline-offset-4 transition hover:text-primary/80"
            onClick={() => (window.location.href = "/polls")}
          >
            전체 투표 둘러보기
          </button>
        </div>

        <div className="rounded-3xl border border-border bg-panel/70 p-4 shadow-inner sm:p-5">
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 xl:gap-5">
            {polls.map((poll) => {
              const totalVotes = poll.poll_options.reduce(
                (acc, option) => acc + (option.votes || 0),
                0
              );
              const isPollClosed = poll.status === "closed" || isPollExpired(poll.expires_at);
              const userHasVoted = hasVoted(poll.id);
              return (
                <div key={poll.id}>
                  <PollCard
                    poll={poll}
                    totalVotes={totalVotes}
                    isPollClosed={isPollClosed}
                    hasVoted={userHasVoted}
                    onToggleFavorite={() => handleToggleFavorite(poll.id)}
                    favoritePending={favoritePendingId === poll.id}
                    canFavorite={Boolean(session)}
                    isFavorited={poll.is_favorited}
                    timeRemaining={getTimeRemaining(poll.expires_at)}
                    interactive={false}
                    variant="grid"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
