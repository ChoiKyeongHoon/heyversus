"use client";

import { InfiniteData, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/EmptyState";
import { LoadMoreTrigger } from "@/components/polls/LoadMoreTrigger";
import { PollCard } from "@/components/polls/PollCard";
import { type PollCategoryKey,PollCategoryTabs } from "@/components/polls/PollCategoryTabs";
import { PollsFilterBar } from "@/components/polls/PollsFilterBar";
import { PollsHero } from "@/components/polls/PollsHero";
import { Button } from "@/components/ui/button";
import { GradientSpinner } from "@/components/ui/loader";
import { useInfinitePolls } from "@/hooks/useInfinitePolls";
import { useSupabase } from "@/hooks/useSupabase";
import { useToggleFavorite } from "@/hooks/useToggleFavorite";
import { useVoteStatus } from "@/hooks/useVoteStatus";
import type {
  FilterStatus,
  PollsResponse,
  PollWithOptions,
  SortBy,
  SortOrder,
} from "@/lib/types";
import { isPollExpired } from "@/lib/utils";

type PollsClientInfiniteProps = {
  heading?: string;
  emptyState?: {
    title: string;
    message: string;
    actionLabel?: string;
    actionHref?: string;
  };
};

const CATEGORY_PRESETS: Record<PollCategoryKey, { sortBy: SortBy; sortOrder: SortOrder; filterStatus: FilterStatus }> = {
  latest: { sortBy: "created_at", sortOrder: "desc", filterStatus: "all" },
  popular: { sortBy: "votes", sortOrder: "desc", filterStatus: "all" },
  closing: { sortBy: "expires_at", sortOrder: "asc", filterStatus: "active" },
};

export default function PollsClientInfinite({
  heading = "진행중인 투표들",
  emptyState,
}: PollsClientInfiniteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  const categoryParam = (searchParams.get("category") as PollCategoryKey) || "latest";
  const categoryPreset = CATEGORY_PRESETS[categoryParam];

  const sortBy = (searchParams.get("sortBy") as SortBy) || categoryPreset.sortBy;
  const sortOrder = (searchParams.get("sortOrder") as SortOrder) || categoryPreset.sortOrder;
  const filterStatus = (searchParams.get("filterStatus") as FilterStatus) || categoryPreset.filterStatus;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useInfinitePolls({
    sortBy,
    sortOrder,
    filterStatus,
  });

  const [selectedOptionIds, setSelectedOptionIds] = useState<Record<string, string | null>>({});
  const toggleFavoriteMutation = useToggleFavorite();
  const [favoritePendingId, setFavoritePendingId] = useState<string | null>(null);

  const updateCachedPoll = useCallback(
    (
      pollId: string,
      updater: (_poll: PollWithOptions) => PollWithOptions
    ) => {
      queryClient.setQueriesData<InfiniteData<PollsResponse>>(
        { queryKey: ["polls", "infinite"] },
        (oldData) => {
          if (!oldData) {
            return oldData;
          }

          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              data: page.data.map((poll) =>
                poll.id === pollId ? updater(poll) : poll
              ),
            })),
          };
        }
      );
    },
    [queryClient]
  );

  const polls = useMemo(() => data?.pages.flatMap((page) => page.data) || [], [data?.pages]);
  const totalCount = data?.pages[0]?.pagination.total;
  const serverVotedIds = useMemo(
    () => polls.filter((p) => p.has_voted).map((p) => p.id),
    [polls]
  );
  const { session, hasVoted, markVoted } = useVoteStatus(serverVotedIds);

  useEffect(() => {
    if (session) {
      queryClient.invalidateQueries({ queryKey: ["polls", "infinite"] });
    }
  }, [session, queryClient]);

  const updateUrlParams = useCallback(
    (params: {
      sortBy?: SortBy;
      sortOrder?: SortOrder;
      filterStatus?: FilterStatus;
      category?: PollCategoryKey;
    }) => {
      const newParams = new URLSearchParams(searchParams.toString());

      if (params.sortBy) newParams.set("sortBy", params.sortBy);
      if (params.sortOrder) newParams.set("sortOrder", params.sortOrder);
      if (params.filterStatus) newParams.set("filterStatus", params.filterStatus);
      if (params.category) newParams.set("category", params.category);

      router.push(`${pathname}?${newParams.toString()}`);
    },
    [pathname, router, searchParams]
  );

  const handleCategoryChange = useCallback(
    (nextCategory: PollCategoryKey) => {
      const preset = CATEGORY_PRESETS[nextCategory];
      updateUrlParams({
        category: nextCategory,
        sortBy: preset.sortBy,
        sortOrder: preset.sortOrder,
        filterStatus: preset.filterStatus,
      });
    },
    [updateUrlParams]
  );

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

  const handleOptionSelect = (pollId: string, optionId: string) => {
    setSelectedOptionIds((prev) => ({
      ...prev,
      [pollId]: optionId,
    }));
  };

  const handleVote = async (pollId: string) => {
    const optionId = selectedOptionIds[pollId];

    if (!optionId) {
      toast.warning("투표할 옵션을 선택해주세요.");
      return;
    }

    if (hasVoted(pollId)) {
      toast.warning("이미 이 투표에 참여했습니다.");
      return;
    }

    const { error } = await supabase.rpc("increment_vote", {
      option_id_to_update: optionId,
      poll_id_for_vote: pollId,
    });

    if (error) {
      console.error("Error voting:", error);
      if (error.message.includes("User has already voted")) {
        toast.warning("이미 이 투표에 참여했습니다.");
        markVoted(pollId);
      } else if (error.message.includes("Authentication required")) {
        toast.error("이 투표는 로그인이 필요합니다.");
      } else {
        toast.error("투표 중 오류가 발생했습니다.");
      }
      return;
    }

    markVoted(pollId);
    setSelectedOptionIds((prev) => ({
      ...prev,
      [pollId]: null,
    }));

    updateCachedPoll(pollId, (poll) => ({
      ...poll,
      has_voted: true,
      poll_options: poll.poll_options.map((option) =>
        option.id === optionId
          ? { ...option, votes: (option.votes ?? 0) + 1 }
          : option
      ),
    }));

    toast.success("투표가 완료되었습니다!");
    queryClient.invalidateQueries({ queryKey: ["polls", "infinite"] });
  };

  const handleToggleFavorite = (pollId: string) => {
    if (!session) {
      toast.error("즐겨찾기는 로그인 후 이용할 수 있습니다.");
      router.push(`/signin?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    setFavoritePendingId(pollId);

    toggleFavoriteMutation.mutate(
      { pollId },
      {
        onSuccess: ({ isFavorited }) => {
          toast.success(
            isFavorited ? "즐겨찾기에 추가했습니다." : "즐겨찾기에서 제거했습니다."
          );
          updateCachedPoll(pollId, (poll) => ({
            ...poll,
            is_favorited: isFavorited,
          }));
          queryClient.invalidateQueries({ queryKey: ["polls", "infinite"] });
        },
        onError: (err: unknown) => {
          console.error("Error toggling favorite:", err);
          toast.error("즐겨찾기 처리 중 오류가 발생했습니다.");
        },
        onSettled: () => setFavoritePendingId(null),
      }
    );
  };

  const stats = useMemo(() => {
    const active = polls.filter((poll) => !isPollExpired(poll.expires_at) && poll.status !== "closed").length;
    const closingSoon = polls.filter((poll) => {
      if (!poll.expires_at) return false;
      const diff = new Date(poll.expires_at).getTime() - Date.now();
      return diff > 0 && diff <= 1000 * 60 * 60 * 24;
    }).length;
    const favorited = polls.filter((poll) => poll.is_favorited).length;

    return [
      { label: "총 투표 수", value: totalCount ? totalCount.toLocaleString() : "-" },
      { label: "현재 진행", value: `${active}개`, helper: "열려 있는 투표" },
      { label: "24시간 내 마감", value: `${closingSoon}개` },
      { label: "즐겨찾기", value: `${favorited}개`, helper: "내가 저장한 투표" },
    ];
  }, [polls, totalCount]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-12">
          <GradientSpinner />
        </div>
      );
    }

    if (isError) {
      return (
        <EmptyState
          title="오류가 발생했습니다"
          message={error?.message || "투표 목록을 불러올 수 없습니다."}
          actionLabel="새로고침"
          actionHref={pathname}
        />
      );
    }

    if (polls.length === 0) {
      return (
        <EmptyState
          title={emptyState?.title || "투표가 없습니다"}
          message={emptyState?.message || "첫 번째 투표를 만들어보세요!"}
          actionLabel={emptyState?.actionLabel || "투표 만들기"}
          actionHref={emptyState?.actionHref || "/create-poll"}
        />
      );
    }

    return (
      <div className="space-y-6">
        {polls.map((poll) => {
          const totalVotes = poll.poll_options.reduce(
            (acc, option) => acc + (option.votes || 0),
            0
          );
          const isPollClosed = poll.status === "closed" || isPollExpired(poll.expires_at);
          const userHasVoted = hasVoted(poll.id);
          const selectedOption = selectedOptionIds[poll.id] ?? null;

          return (
            <PollCard
              key={poll.id}
              poll={poll}
              totalVotes={totalVotes}
              isPollClosed={isPollClosed}
              hasVoted={userHasVoted}
              selectedOptionId={selectedOption}
              onSelectOption={(optionId) => handleOptionSelect(poll.id, optionId)}
              onVote={() => handleVote(poll.id)}
              onToggleFavorite={session ? () => handleToggleFavorite(poll.id) : undefined}
              favoritePending={favoritePendingId === poll.id}
              canFavorite={Boolean(session)}
              isFavorited={poll.is_favorited}
              timeRemaining={getTimeRemaining(poll.expires_at)}
            />
          );
        })}

        {hasNextPage && (
          <LoadMoreTrigger
            onLoadMore={() => fetchNextPage()}
            isLoading={isFetchingNextPage}
            hasMore={Boolean(hasNextPage)}
          />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
      <div className="container mx-auto">
        <PollsHero stats={stats} />
      </div>

      <div className="container mx-auto space-y-6">
        <div className="rounded-3xl border border-border bg-panel/60 p-4 shadow-inner">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-text-primary md:text-2xl">{heading}</h2>
            <PollCategoryTabs active={categoryParam} onChange={handleCategoryChange} />
          </div>
          <div className="mt-4">
            <PollsFilterBar
              sortBy={sortBy}
              sortOrder={sortOrder}
              filterStatus={filterStatus}
              onSortByChange={(val) => updateUrlParams({ sortBy: val })}
              onSortOrderChange={(val) => updateUrlParams({ sortOrder: val })}
              onFilterStatusChange={(val) => updateUrlParams({ filterStatus: val })}
              onSortChange={({ sortBy: nextSortBy, sortOrder: nextSortOrder }) =>
                updateUrlParams({ sortBy: nextSortBy, sortOrder: nextSortOrder })
              }
              totalCount={totalCount}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-background-subtle px-4 py-3 text-sm text-text-secondary">
          <span>맞춤 필터가 필요하신가요?</span>
          <Button
            variant="link"
            className="p-0 text-primary"
            onClick={() => router.push("/favorites")}
          >
            즐겨찾기에서 내가 저장한 투표 보기
          </Button>
        </div>

        {renderContent()}
      </div>
    </div>
  );
}
