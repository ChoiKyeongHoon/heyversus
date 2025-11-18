"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { STORAGE_KEYS } from "@/constants/storage";
import { usePollVote } from "@/hooks/usePollVote";
import { useVisibilityChange } from "@/hooks/useVisibilityChange";
import { getToast } from "@/lib/toast";
import type { PollWithOptions } from "@/lib/types";
import { formatExpiryDate, isPollExpired } from "@/lib/utils";

interface PollClientProps {
  poll: PollWithOptions;
  onRefresh?: () => void;
}

export default function PollClient({ poll, onRefresh }: PollClientProps) {
  const voteMutation = usePollVote({
    onSuccess: () => {
      onRefresh?.();
    },
  });
  // `has_voted`는 서버에서 내려온, 로그인 사용자의 투표 여부입니다.
  const [isVoted, setIsVoted] = useState(poll.has_voted || false);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  // 탭 전환 시 자동 새로고침
  useVisibilityChange(() => {
    onRefresh?.();
  });

  // poll prop이 변경될 때마다 내부 상태를 동기화합니다.
  useEffect(() => {
    // 서버에서 이미 투표했다고 알려주면, 그 값을 최우선으로 신뢰합니다.
    if (poll.has_voted) {
      setIsVoted(true);
      return;
    }
    // 서버에서 투표하지 않았다고 할 경우, 비로그인 상태를 대비해 로컬 스토리지를 확인합니다.
    const storedVotes = localStorage.getItem(STORAGE_KEYS.VOTED_POLLS);
    if (storedVotes) {
      const votedPolls: string[] = JSON.parse(storedVotes);
      setIsVoted(votedPolls.includes(poll.id));
    } else {
      setIsVoted(false);
    }
  }, [poll]);

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

  const handleVote = async (optionId: string) => {
    if (isVoted || voteMutation.isPending) return;

    // Optimistic update: 즉시 UI 상태 업데이트
    setIsVoted(true);

    // React Query mutation 실행
    voteMutation.mutate(
      { pollId: poll.id, optionId },
      {
        onError: () => {
          // 에러 발생 시 롤백
          setIsVoted(false);
        },
      }
    );
  };

  const totalVotes = poll.poll_options.reduce(
    (acc, option) => acc + (option.votes || 0),
    0
  );
  const leadingOption = poll.poll_options.reduce<{
    text: string;
    votes: number;
  } | null>((best, option) => {
    const votes = option.votes || 0;
    if (!best || votes > best.votes) {
      return { text: option.text, votes };
    }
    return best;
  }, null);
  const isPollClosed = poll.status === 'closed' || isPollExpired(poll.expires_at);

  return (
    <div className="container mx-auto max-w-4xl px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
      {/* Header */}
      <header className="mb-8 md:mb-12 text-center">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tighter mb-2 px-4">
          {poll.question}
        </h1>
        <p className="text-sm md:text-base lg:text-lg text-text-secondary px-4">
          {isPollClosed ? "투표가 마감되었습니다." : "투표에 참여해보세요."}
        </p>
      </header>

      {/* Main Content */}
      <main className="space-y-6">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-background/70 px-4 py-3">
            <p className="text-xs text-text-tertiary">총 투표 수</p>
            <p className="text-2xl font-bold text-text-primary">
              {totalVotes.toLocaleString()}표
            </p>
            <p className="text-xs text-text-secondary">
              참여자가 많을수록 결과가 정확해집니다.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background/70 px-4 py-3">
            <p className="text-xs text-text-tertiary">현재 상태</p>
            <p className={`text-2xl font-bold ${isPollClosed ? "text-destructive" : "text-primary"}`}>
              {isPollClosed ? "마감됨" : "진행 중"}
            </p>
            <p className="text-xs text-text-secondary">
              {isPollClosed ? "결과가 확정되었습니다." : "지금 참여해서 의견을 남겨보세요."}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background/70 px-4 py-3">
            <p className="text-xs text-text-tertiary">남은 시간</p>
            <p className="text-2xl font-bold text-text-primary">
              {getTimeRemaining(poll.expires_at) || "기한 없음"}
            </p>
            <p className="text-xs text-text-secondary">
              {poll.expires_at
                ? new Date(poll.expires_at).toLocaleString("ko-KR")
                : "영구적으로 진행"}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background/70 px-4 py-3">
            <p className="text-xs text-text-tertiary">선두 옵션</p>
            <p className="text-2xl font-bold text-text-primary">
              {leadingOption?.text ?? "-"}
            </p>
            <p className="text-xs text-text-secondary">
              {leadingOption
                ? `${leadingOption.votes.toLocaleString()}표 획득`
                : "아직 결과가 없습니다."}
            </p>
          </div>
        </section>

        <div className={`bg-panel border border-border rounded-lg shadow-lg overflow-hidden mb-6 md:mb-8 ${isPollClosed ? 'opacity-60' : ''}`}>
          <div className="p-4 md:p-6">
            <h3 className="text-lg md:text-xl font-semibold text-text-primary mb-2">
              {poll.question}
            </h3>
            <p className="text-sm md:text-base text-text-secondary mb-4 md:mb-6">
              {isPollClosed ? "결과를 확인하세요." : "이 투표에 참여해보세요."}
            </p>

            {/* Poll Options - Always show results if poll is closed */}
            {(!isVoted && !isPollClosed) && (
              <div className="space-y-2 md:space-y-3 mb-4 md:mb-6">
                {poll.poll_options.map((option) => (
                    <div
                      key={option.id}
                      className={`flex items-center justify-between bg-surface p-2.5 md:p-3 rounded-md border cursor-pointer hover:bg-panel-hover min-h-[44px] ${selectedOptionId === option.id ? 'border-primary' : 'border-border-subtle'}`}
                      onClick={() => setSelectedOptionId(option.id)}
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
                        <span className="text-sm md:text-base text-text-primary truncate">{option.text}</span>
                      </div>
                      <span className="text-xs md:text-sm text-text-tertiary ml-2 flex-shrink-0">
                        {option.votes || 0}
                      </span>
                    </div>
                  ))}
              </div>
            )}

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
              {!isVoted && !isPollClosed && !voteMutation.isPending && (
                <button
                  onClick={() => handleVote(selectedOptionId!)}
                  className="bg-primary hover:bg-primary-hover text-white font-semibold py-2.5 px-4 rounded-md transition-colors duration-200 text-sm md:text-base min-h-[44px]"
                  disabled={!selectedOptionId}
                >
                  투표하기
                </button>
              )}
              {isVoted && !isPollClosed && (
                <span className="text-success font-semibold py-2.5 px-4 text-sm md:text-base min-h-[44px] flex items-center">
                  ✓ 투표 완료
                </span>
              )}
              {voteMutation.isPending && (
                <span className="text-text-secondary font-semibold py-2.5 px-4 text-sm md:text-base min-h-[44px] flex items-center">
                  투표 중...
                </span>
              )}
              <button
                type="button"
                onClick={async () => {
                  const pollUrl = window.location.href;
                  try {
                    await navigator.clipboard.writeText(pollUrl);
                    const toast = await getToast();
                    toast.success("투표 링크가 클립보드에 복사되었습니다!");
                  } catch (err) {
                    console.error("Failed to copy link:", err);
                    const toast = await getToast();
                    toast.error("링크 복사에 실패했습니다.");
                  }
                }}
                className="bg-transparent border border-border hover:bg-panel-hover text-text-secondary font-semibold py-2.5 px-4 rounded-md transition-colors duration-200 text-sm md:text-base text-center min-h-[44px] flex items-center justify-center"
              >
                링크 공유
              </button>
            </div>

            {/* Results Section - Always visible */}
            {true && (
              <div className="mt-4 md:mt-6 space-y-2 md:space-y-3">
                <h3 className="text-base md:text-lg font-semibold text-text-primary mb-3 md:mb-4">
                  투표 결과
                </h3>
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
                {isVoted && !isPollClosed && (
                  <p className="text-center text-success mt-4 font-semibold">
                    투표에 참여해주셔서 감사합니다!
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="bg-background-subtle px-4 md:px-6 py-2.5 md:py-3 border-t border-border">
            <div className="flex flex-col sm:flex-row justify-center items-center gap-1 sm:gap-4">
              <p className="text-xs md:text-sm text-text-tertiary">
                {getTimeRemaining(poll.expires_at)}
              </p>
              <p className="text-xs md:text-sm text-text-tertiary">
                (마감: {formatExpiryDate(poll.expires_at)})
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
