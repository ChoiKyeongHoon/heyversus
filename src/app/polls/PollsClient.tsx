"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { useToggleFavorite } from "@/hooks/useToggleFavorite";
import { useVisibilityChange } from "@/hooks/useVisibilityChange";
import { useVoteStatus } from "@/hooks/useVoteStatus";
import { submitVoteRequest } from "@/lib/api/vote";
import { getToast } from "@/lib/toast";
import type { PollWithOptions } from "@/lib/types";
import { formatExpiryDate, isPollExpired } from "@/lib/utils";

type PollsClientProps = {
  serverPolls: PollWithOptions[];
  heading?: string;
  emptyState?: {
    title: string;
    message: string;
    actionLabel?: string;
    actionHref?: string;
  };
  removeOnUnfavorite?: boolean;
};

export default function PollsClient({
  serverPolls,
  heading = "진행중인 투표들",
  emptyState,
  removeOnUnfavorite = false,
}: PollsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [polls, setPolls] = useState(serverPolls);
  const serverVotedIds = useMemo(
    () => polls.filter((p) => p.has_voted).map((p) => p.id),
    [polls]
  );
  const { session, hasVoted, markVoted } = useVoteStatus(serverVotedIds);
  const [selectedOptionIds, setSelectedOptionIds] = useState<
    Record<string, string | null>
  >({});
  const toggleFavoriteMutation = useToggleFavorite();
  const [favoritePendingId, setFavoritePendingId] = useState<string | null>(
    null
  );

  useEffect(() => {
    // serverPolls prop이 변경될 때마다 내부 상태를 동기화합니다.
    // router.refresh() 등으로 부모 컴포넌트의 데이터가 갱신되면 이 부분이 실행됩니다.
    setPolls(serverPolls);
    setSelectedOptionIds({});
  }, [serverPolls]);

  // 탭 전환 시 자동 새로고침
  useVisibilityChange(() => {
    router.refresh();
  });

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
      const toast = await getToast();
      toast.warning("투표할 옵션을 선택해주세요.");
      return;
    }

    const isAlreadyVoted = hasVoted(pollId);

    if (isAlreadyVoted) {
      const toast = await getToast();
      toast.warning("이미 이 투표에 참여했습니다.");
      return;
    }

    try {
      await submitVoteRequest({ pollId, optionId });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "투표 중 오류가 발생했습니다.";

      console.error("Error voting:", error);
      const toast = await getToast();

      if (message.includes("User has already voted")) {
        toast.warning("이미 이 투표에 참여했습니다.");
        markVoted(pollId);
      } else if (message.includes("Authentication required")) {
        toast.error("이 투표는 로그인이 필요합니다.");
      } else {
        toast.error(message);
      }

      return;
    }

    // 투표 성공 시 UI를 즉시 업데이트합니다.
    setPolls((currentPolls) =>
      currentPolls.map((poll) => {
        if (poll.id === pollId) {
          const updatedOptions = poll.poll_options.map((option) => {
            if (option.id === optionId) {
              return { ...option, votes: option.votes + 1 };
            }
            return option;
          });
          return { ...poll, poll_options: updatedOptions };
        }
        return poll;
      })
    );

    markVoted(pollId);

    setSelectedOptionIds((prev) => ({
      ...prev,
      [pollId]: null,
    }));
  };

  const handleToggleFavorite = async (pollId: string) => {
    if (!session) {
      const toast = await getToast();
      toast.error("즐겨찾기는 로그인 후 이용할 수 있습니다.");
      router.push(`/signin?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    setFavoritePendingId(pollId);

    toggleFavoriteMutation.mutate(
      { pollId },
      {
        onSuccess: async ({ isFavorited }) => {
          setPolls((currentPolls) => {
            if (removeOnUnfavorite && !isFavorited) {
              return currentPolls.filter((poll) => poll.id !== pollId);
            }
            return currentPolls.map((poll) =>
              poll.id === pollId
                ? { ...poll, is_favorited: isFavorited }
                : poll
            );
          });
          if (removeOnUnfavorite && !isFavorited) {
            setSelectedOptionIds((prev) => {
              const rest = { ...prev };
              delete rest[pollId];
              return rest;
            });
          }
          const toast = await getToast();
          toast.success(
            isFavorited
              ? "즐겨찾기에 추가했습니다."
              : "즐겨찾기에서 제거했습니다."
          );
          router.refresh();
        },
        onError: async (error: unknown) => {
          console.error("Error toggling favorite:", error);
          const message =
            typeof error === "object" &&
            error !== null &&
            "message" in error &&
            typeof (error as { message?: string }).message === "string"
              ? (error as { message: string }).message
              : "";

          const toast = await getToast();

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

  const effectiveEmptyState =
    emptyState ?? {
      title: "진행중인 투표가 없습니다",
      message: "아직 생성된 투표가 없어요. 첫 번째 투표를 만들어보세요!",
      actionLabel: "투표 만들기",
      actionHref: "/create-poll",
    };

  return (
    <div className="container mx-auto max-w-4xl px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
      {/* Main Content */}
      <main>
        <h2 className="text-xl md:text-2xl font-semibold tracking-tight mb-4 md:mb-6 text-center">
          {heading}
        </h2>

        {polls.length === 0 ? (
          <EmptyState
            title={effectiveEmptyState.title}
            message={effectiveEmptyState.message}
            actionLabel={effectiveEmptyState.actionLabel}
            actionHref={effectiveEmptyState.actionHref}
          />
        ) : (
          polls.map((poll) => {
            // 로그인 상태에 따라 투표 여부를 확인합니다.
          const isVoted = hasVoted(poll.id);
            const isFavorited = Boolean(poll.is_favorited);

            // 각 투표의 총 투표수를 계산합니다.
            const totalVotes = poll.poll_options.reduce(
              (acc, option) => acc + option.votes,
              0
            );
            const isPollClosed =
              poll.status === "closed" || isPollExpired(poll.expires_at);
            const selectedOptionIdForPoll = selectedOptionIds[poll.id];

            return (
              <div
                key={poll.id}
                className={`bg-panel border border-border rounded-lg shadow-lg overflow-hidden mb-6 md:mb-8 ${
                  isPollClosed ? "opacity-60" : ""
                }`}
              >
                <div className="p-4 md:p-6">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-3 md:gap-4 mb-2">
                    <h3 className="text-lg md:text-xl font-semibold text-text-primary">
                      {poll.question}
                    </h3>
                    <Button
                      variant={isFavorited ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => handleToggleFavorite(poll.id)}
                      disabled={
                        favoritePendingId === poll.id &&
                        toggleFavoriteMutation.isPending
                      }
                      aria-label={
                        isFavorited
                          ? "즐겨찾기에서 제거"
                          : "즐겨찾기에 추가"
                      }
                    >
                      {isFavorited ? "즐겨찾기 해제" : "즐겨찾기"}
                    </Button>
                  </div>
                  <p className="text-sm md:text-base text-text-secondary mb-4 md:mb-6">
                    이 투표에 참여해보세요.
                  </p>

                  {/* Poll Options */}
                  <div className="space-y-2 md:space-y-3 mb-4 md:mb-6">
                    {poll.poll_options.map((option) => {
                      // 각 옵션의 득표율을 계산합니다.
                      const percentage =
                        totalVotes > 0
                          ? Math.round((option.votes / totalVotes) * 100)
                          : 0;

                      return (
                        <div
                          key={option.id}
                          className={`flex items-center justify-between bg-surface p-2.5 md:p-3 rounded-md border min-h-[44px] ${
                            isVoted || isPollClosed
                              ? "cursor-not-allowed"
                              : "cursor-pointer hover:bg-panel-hover"
                          } ${
                            selectedOptionIdForPoll === option.id
                              ? "border-primary"
                              : "border-border-subtle"
                          }`}
                          onClick={() =>
                            !isVoted &&
                            !isPollClosed &&
                            handleOptionSelect(poll.id, option.id)
                          }
                        >
                          <div className="flex items-center min-w-0 flex-1">
                            {option.image_url && (
                              <div className="relative w-10 h-10 md:w-12 md:h-12 mr-3 md:mr-4 rounded-md overflow-hidden flex-shrink-0">
                                <Image
                                  src={option.image_url}
                                  alt={option.text}
                                  fill
                                  quality={70}
                                  sizes="(max-width: 768px) 40px, 48px"
                                  style={{ objectFit: "cover" }}
                                />
                              </div>
                            )}
                            <h3 className="text-sm md:text-base text-text-primary truncate">{option.text}</h3>
                          </div>
                          <span className="text-xs md:text-sm text-text-tertiary ml-2 flex-shrink-0">
                            {isVoted || isPollClosed
                              ? `${option.votes} (${percentage}%)`
                              : `${option.votes}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Buttons */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
                    {!isVoted && !isPollClosed && (
                      <button
                        onClick={() => handleVote(poll.id)}
                        className="bg-primary hover:bg-primary-hover text-white font-semibold py-2.5 px-4 rounded-md transition-colors duration-200 text-sm md:text-base min-h-[44px]"
                        disabled={!selectedOptionIdForPoll} // Disable if no option is selected
                      >
                        투표하기
                      </button>
                    )}
                    {isVoted && !isPollClosed && (
                      <span className="text-success font-semibold py-2.5 px-4 text-sm md:text-base min-h-[44px] flex items-center">
                        ✓ 투표 완료
                      </span>
                    )}
                    <Link
                      href={`/poll/${poll.id}`}
                      className="bg-transparent border border-border hover:bg-panel-hover text-text-secondary font-semibold py-2.5 px-4 rounded-md transition-colors duration-200 text-sm md:text-base text-center min-h-[44px] flex items-center justify-center"
                    >
                      결과 보기
                    </Link>
                  </div>
                </div>
                <div className="bg-background-subtle px-4 md:px-6 py-2.5 md:py-3 border-t border-border">
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-1 sm:gap-2">
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
          })
        )}
      </main>
    </div>
  );
}
