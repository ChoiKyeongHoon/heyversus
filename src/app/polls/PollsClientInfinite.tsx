"use client";

import { InfiniteData, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/common/EmptyState";
import { LoadMoreTrigger } from "@/components/polls/LoadMoreTrigger";
import { PollsFilterBar } from "@/components/polls/PollsFilterBar";
import { Button } from "@/components/ui/button";
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
import { formatExpiryDate, isPollExpired } from "@/lib/utils";

type PollsClientInfiniteProps = {
  heading?: string;
  emptyState?: {
    title: string;
    message: string;
    actionLabel?: string;
    actionHref?: string;
  };
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

  // Get filter/sort params from URL
  const sortBy = (searchParams.get('sortBy') as SortBy) || 'created_at';
  const sortOrder = (searchParams.get('sortOrder') as SortOrder) || 'desc';
  const filterStatus = (searchParams.get('filterStatus') as FilterStatus) || 'all';

  // Use infinite scroll hook
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

  const [selectedOptionIds, setSelectedOptionIds] = useState<
    Record<string, string | null>
  >({});
  const toggleFavoriteMutation = useToggleFavorite();
  const [favoritePendingId, setFavoritePendingId] = useState<string | null>(null);
  const updateCachedPoll = useCallback(
    (
      pollId: string,
      updater: (_poll: PollWithOptions) => PollWithOptions
    ) => {
      queryClient.setQueriesData<InfiniteData<PollsResponse>>(
        { queryKey: ['polls', 'infinite'] },
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

  // Flatten pages into single array of polls (memoized to prevent re-renders)
  const polls = useMemo(
    () => data?.pages.flatMap((page) => page.data) || [],
    [data?.pages]
  );
  const totalCount = data?.pages[0]?.pagination.total;
  const serverVotedIds = useMemo(
    () => polls.filter((p) => p.has_voted).map((p) => p.id),
    [polls]
  );
  const { session, hasVoted, markVoted } = useVoteStatus(serverVotedIds);

  useEffect(() => {
    if (session) {
      queryClient.invalidateQueries({ queryKey: ['polls', 'infinite'] });
    }
  }, [session, queryClient]);

  // URL param update helper
  const updateUrlParams = useCallback(
    (params: { sortBy?: SortBy; sortOrder?: SortOrder; filterStatus?: FilterStatus }) => {
      const newParams = new URLSearchParams(searchParams.toString());

      if (params.sortBy) newParams.set('sortBy', params.sortBy);
      if (params.sortOrder) newParams.set('sortOrder', params.sortOrder);
      if (params.filterStatus) newParams.set('filterStatus', params.filterStatus);

      router.push(`${pathname}?${newParams.toString()}`);
    },
    [pathname, router, searchParams]
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

    const isAlreadyVoted = hasVoted(pollId);

    if (isAlreadyVoted) {
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
    } else {
      // Record vote completion
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
      queryClient.invalidateQueries({ queryKey: ['polls', 'infinite'] });
    }
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
            isFavorited
              ? "즐겨찾기에 추가했습니다."
              : "즐겨찾기에서 제거했습니다."
          );
          updateCachedPoll(pollId, (poll) => ({
            ...poll,
            is_favorited: isFavorited,
          }));
          queryClient.invalidateQueries({ queryKey: ['polls', 'infinite'] });
        },
        onError: (error: unknown) => {
          console.error("Error toggling favorite:", error);
          const message =
            typeof error === "object" &&
            error !== null &&
            "message" in error &&
            typeof (error as { message?: string }).message === "string"
              ? (error as { message: string }).message
              : "";

          if (message.includes("Authentication required")) {
            toast.error("다시 로그인한 후 즐겨찾기를 사용할 수 있습니다.");
            router.push(`/signin?redirect=${encodeURIComponent(pathname)}`);
          } else {
            toast.error("즐겨찾기 처리 중 오류가 발생했습니다.");
          }
        },
        onSettled: () => setFavoritePendingId(null),
      }
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
        <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">{heading}</h2>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
        <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">{heading}</h2>
        <EmptyState
          title="오류가 발생했습니다"
          message={error?.message || "투표 목록을 불러올 수 없습니다."}
          actionLabel="새로고침"
          actionHref={pathname}
        />
      </div>
    );
  }

  // Empty state
  if (polls.length === 0) {
    return (
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
        <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">{heading}</h2>
        <PollsFilterBar
          sortBy={sortBy}
          sortOrder={sortOrder}
          filterStatus={filterStatus}
          onSortByChange={(val) => updateUrlParams({ sortBy: val })}
          onSortOrderChange={(val) => updateUrlParams({ sortOrder: val })}
          onFilterStatusChange={(val) => updateUrlParams({ filterStatus: val })}
          totalCount={0}
        />
        <EmptyState
          title={emptyState?.title || "투표가 없습니다"}
          message={emptyState?.message || "첫 번째 투표를 만들어보세요!"}
          actionLabel={emptyState?.actionLabel || "투표 만들기"}
          actionHref={emptyState?.actionHref || "/create-poll"}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
      <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">{heading}</h2>

      {/* Filter Bar */}
      <PollsFilterBar
        sortBy={sortBy}
        sortOrder={sortOrder}
        filterStatus={filterStatus}
        onSortByChange={(val) => updateUrlParams({ sortBy: val })}
        onSortOrderChange={(val) => updateUrlParams({ sortOrder: val })}
        onFilterStatusChange={(val) => updateUrlParams({ filterStatus: val })}
        totalCount={totalCount}
      />

      {/* Poll List */}
      <div className="space-y-4 md:space-y-6">
        {polls.map((poll) => {
          const totalVotes = poll.poll_options.reduce(
            (acc, option) => acc + (option.votes || 0),
            0
          );
          const isPollClosed = poll.status === 'closed' || isPollExpired(poll.expires_at);
          const hasUserVoted = hasVoted(poll.id);
          const selectedOption = selectedOptionIds[poll.id];

          return (
            <div
              key={poll.id}
              className={`bg-panel border border-border rounded-lg shadow-lg overflow-hidden ${
                isPollClosed ? 'opacity-60' : ''
              }`}
            >
              <div className="p-4 md:p-6">
                <div className="flex justify-between items-start mb-4">
                  <Link
                    href={`/poll/${poll.id}`}
                    className="flex-1 min-w-0 group"
                  >
                    <h3 className="text-lg md:text-xl font-semibold text-text-primary mb-2 group-hover:text-primary transition-colors truncate">
                      {poll.question}
                    </h3>
                  </Link>
                  {session && (
                    <button
                      onClick={() => handleToggleFavorite(poll.id)}
                      disabled={favoritePendingId === poll.id}
                      className={`ml-3 flex-shrink-0 text-2xl transition-all duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center ${
                        poll.is_favorited
                          ? 'text-yellow-500 hover:text-yellow-600'
                          : 'text-gray-400 hover:text-yellow-500'
                      } ${
                        favoritePendingId === poll.id ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {poll.is_favorited ? '★' : '☆'}
                    </button>
                  )}
                </div>

                <p className="text-sm md:text-base text-text-secondary mb-4 md:mb-6">
                  {isPollClosed ? "결과를 확인하세요." : "이 투표에 참여해보세요."}
                </p>

                {/* Poll Options */}
                {!hasUserVoted && !isPollClosed && (
                  <div className="space-y-2 md:space-y-3 mb-4 md:mb-6">
                    {poll.poll_options.map((option) => (
                      <div
                        key={option.id}
                        className={`flex items-center justify-between bg-surface p-2.5 md:p-3 rounded-md border cursor-pointer hover:bg-panel-hover min-h-[44px] ${
                          selectedOption === option.id
                            ? 'border-primary'
                            : 'border-border-subtle'
                        }`}
                        onClick={() => handleOptionSelect(poll.id, option.id)}
                      >
                        <div className="flex items-center min-w-0 flex-1">
                          {option.image_url && (
                            <div className="relative w-10 h-10 md:w-12 md:h-12 mr-3 md:mr-4 rounded-md overflow-hidden flex-shrink-0">
                              <Image
                                src={option.image_url}
                                alt={option.text || "Poll option"}
                                fill
                                sizes="(max-width: 768px) 40px, 48px"
                                style={{ objectFit: 'cover' }}
                              />
                            </div>
                          )}
                          <span className="text-sm md:text-base text-text-primary truncate">
                            {option.text}
                          </span>
                        </div>
                        <span className="text-xs md:text-sm text-text-tertiary ml-2 flex-shrink-0">
                          {option.votes || 0}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 mb-4 md:mb-6">
                  {!hasVoted && !isPollClosed && (
                    <Button
                      onClick={() => handleVote(poll.id)}
                      className="bg-primary hover:bg-primary-hover text-white font-semibold py-2.5 px-4 rounded-md transition-colors duration-200 text-sm md:text-base min-h-[44px]"
                      disabled={!selectedOption}
                    >
                      투표하기
                    </Button>
                  )}
                  {hasUserVoted && !isPollClosed && (
                    <span className="text-success font-semibold py-2.5 px-4 text-sm md:text-base min-h-[44px] flex items-center">
                      ✓ 투표 완료
                    </span>
                  )}
                  <Button
                    asChild
                    variant="outline"
                    className="bg-transparent border border-border hover:bg-panel-hover text-text-secondary font-semibold py-2.5 px-4 rounded-md transition-colors duration-200 text-sm md:text-base min-h-[44px] text-center"
                  >
                    <Link href={`/poll/${poll.id}`}>자세히 보기</Link>
                  </Button>
                </div>

                {/* Results Section */}
                {(hasUserVoted || isPollClosed) && (
                  <div className="space-y-2 md:space-y-3">
                    <h4 className="text-base md:text-lg font-semibold text-text-primary">
                      투표 결과
                    </h4>
                    {poll.poll_options.map((option) => {
                      const votePercentage =
                        totalVotes > 0
                          ? ((option.votes || 0) / totalVotes) * 100
                          : 0;
                      return (
                        <div key={option.id} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-text-primary">{option.text}</span>
                            <span className="text-text-tertiary">
                              {option.votes || 0}표 ({votePercentage.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="w-full bg-background-subtle rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full transition-all duration-500"
                              style={{ width: `${votePercentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-background-subtle px-4 md:px-6 py-2.5 md:py-3 border-t border-border">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-1 sm:gap-4">
                  <p className="text-xs md:text-sm text-text-tertiary">
                    {getTimeRemaining(poll.expires_at)}
                  </p>
                  <p className="text-xs md:text-sm text-text-tertiary">
                    마감: {formatExpiryDate(poll.expires_at)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Infinite Scroll Trigger */}
      <LoadMoreTrigger
        onLoadMore={() => fetchNextPage()}
        hasMore={hasNextPage || false}
        isLoading={isFetchingNextPage}
      />
    </div>
  );
}
