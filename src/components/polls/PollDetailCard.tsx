"use client";

import { ArrowLeft, CheckCircle, Link, Lock, Shuffle, Sparkles } from "lucide-react";
import Image from "next/image";
import { useMemo } from "react";

import { getToast } from "@/lib/toast";
import type { PollWithOptions } from "@/lib/types";
import { cn } from "@/lib/utils";

import { FavoriteToggle } from "./FavoriteToggle";

type PollDetailCardProps = {
  poll: PollWithOptions;
  totalVotes: number;
  isPollClosed: boolean;
  hasVoted: boolean;
  timeRemaining: string;
  selectedOptionId: string | null;
  onSelectOption: (_optionId: string) => void;
  onVote: () => void;
  votePending?: boolean;
  onShare?: () => void;
  onBack?: () => void;
  showRouletteTrigger?: boolean;
  onRouletteOpen?: () => void;
  isSpinning?: boolean;
  isFavorited?: boolean;
  favoritePending?: boolean;
  canFavorite?: boolean;
  onToggleFavorite?: () => void;
  rouletteResultOptionId?: string | null;
};

export function PollDetailCard({
  poll,
  totalVotes,
  isPollClosed,
  hasVoted,
  timeRemaining,
  selectedOptionId,
  onSelectOption,
  onVote,
  votePending,
  onShare,
  onBack,
  showRouletteTrigger,
  onRouletteOpen,
  isSpinning,
  isFavorited,
  favoritePending,
  canFavorite,
  onToggleFavorite,
  rouletteResultOptionId,
}: PollDetailCardProps) {
  const showResultsView = hasVoted || isPollClosed;
  const statusMeta = useMemo(() => {
    if (isPollClosed) {
      return {
        label: "투표 마감",
        helper: "결과만 확인 가능합니다.",
        tone: "danger" as const,
        Icon: Lock,
      };
    }
    if (hasVoted) {
      return {
        label: "투표 완료",
        helper: "참여해 주셔서 감사합니다.",
        tone: "success" as const,
        Icon: CheckCircle,
      };
    }
    return {
      label: "참여 대기",
      helper: "옵션을 선택해 투표를 완료하세요.",
      tone: "brand" as const,
      Icon: Sparkles,
    };
  }, [hasVoted, isPollClosed]);

  return (
    <div className="rounded-3xl border border-border bg-panel/60 shadow-inner">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary sm:text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
            {poll.is_public ? "공개" : "비공개"}
          </span>
          {isPollClosed ? (
            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">
              마감됨
            </span>
          ) : (
            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-accent">
              {timeRemaining || "진행 중"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-text-secondary">
          <span>총 {totalVotes.toLocaleString()}표</span>
          <FavoriteToggle
            isFavorited={Boolean(isFavorited)}
            pending={favoritePending}
            onToggle={canFavorite ? onToggleFavorite : undefined}
            redirectPath={`/poll/${poll.id}`}
            size="sm"
          />
        </div>
      </div>

      <div className="space-y-6 p-4 md:p-6">
        <header className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3
              className="text-xl font-semibold text-text-primary transition hover:text-primary md:text-2xl"
              role="button"
              tabIndex={0}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(poll.question);
                  const toast = await getToast();
                  toast.success("제목을 클립보드에 복사했어요.");
                } catch (err) {
                  console.error("Failed to copy title:", err);
                  const toast = await getToast();
                  toast.error("복사에 실패했습니다. 지원되는 브라우저인지 확인해주세요.");
                }
              }}
              onKeyDown={async (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  try {
                    await navigator.clipboard.writeText(poll.question);
                    const toast = await getToast();
                    toast.success("제목을 클립보드에 복사했어요.");
                  } catch (err) {
                    console.error("Failed to copy title:", err);
                    const toast = await getToast();
                    toast.error("복사에 실패했습니다. 지원되는 브라우저인지 확인해주세요.");
                  }
                }
              }}
            >
              {poll.question}
            </h3>
            {onShare && (
              <button
                type="button"
                onClick={onShare}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-text-tertiary transition hover:border-primary/40 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/50"
                aria-label="투표 링크 복사"
              >
                <Link className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="text-sm md:text-base text-text-secondary">
            {isPollClosed ? "결과를 확인하세요." : "이 투표에 참여해보세요."}
          </p>
        </header>

        {!showResultsView && rouletteResultOptionId && (
          <div className="flex items-center gap-2 rounded-md bg-primary/5 px-3 py-2 text-sm text-primary">
            <span className="font-semibold">돌림판 결과</span>
            <span className="truncate">
              {
                poll.poll_options.find(
                  (option) => option.id === rouletteResultOptionId
                )?.text
              }{" "}
              (자동 선택됨)
            </span>
          </div>
        )}

        <div className="space-y-2 md:space-y-3">
          {poll.poll_options.map((option) => {
            const isSelected = selectedOptionId === option.id;
            const isRouletteHighlight =
              !showResultsView && rouletteResultOptionId === option.id;
            const votePercentage =
              totalVotes > 0
                ? Math.round(((option.votes || 0) / totalVotes) * 100)
                : 0;

            const baseClasses = showResultsView
              ? "border-transparent bg-background-subtle cursor-default"
              : isSelected
                ? "border-primary bg-primary/10"
                : "border-border-subtle hover:border-primary/60";

            return (
              <button
                key={option.id}
                type="button"
                disabled={showResultsView}
                onClick={() => {
                  if (showResultsView) return;
                  onSelectOption(option.id);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition",
                  baseClasses,
                  isRouletteHighlight && "ring-1 ring-primary/40"
                )}
              >
                {option.image_url ? (
                  <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg">
                    <Image
                      src={option.image_url}
                      alt={option.text || "Poll option"}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                    VS
                  </div>
                )}
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-semibold text-text-primary md:text-base">
                    {option.text}
                  </span>
                  {showResultsView ? (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-text-tertiary">
                        <span>{votePercentage}%</span>
                        <span>{(option.votes || 0).toLocaleString()}표</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-border/50">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${votePercentage}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-text-secondary">
                      선택하려면 누르세요
                    </span>
                  )}
                </div>
                {!showResultsView && (
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-xs font-semibold",
                      isSelected
                        ? "border-primary text-primary"
                        : "border-border text-text-tertiary"
                    )}
                  >
                    선택
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="space-y-3 rounded-2xl border border-border-subtle bg-background/60 p-4">
          <div className="flex items-center justify-center gap-2 text-center text-xs text-text-secondary sm:text-sm">
            <statusMeta.Icon className="h-4 w-4 flex-shrink-0" />
            <span className="font-semibold text-text-primary">{statusMeta.label}</span>
            <span className="text-text-tertiary">{statusMeta.helper}</span>
          </div>

          <div className="relative flex flex-col items-center justify-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="absolute left-0 top-1/2 -translate-y-1/2 flex h-[20px] w-[20px] items-center justify-center rounded-full border border-border bg-panel hover:bg-panel-hover text-text-secondary transition-colors duration-200 sm:h-[24px] sm:w-[24px]"
                aria-label="투표 목록으로 이동"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2">
              {showRouletteTrigger && onRouletteOpen && (
                <button
                  type="button"
                  onClick={onRouletteOpen}
                  className="flex min-h-[44px] min-w-[150px] items-center justify-center gap-2 rounded-md bg-gradient-to-br from-brand-gold/90 via-brand-gold to-brand-gold/80 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:brightness-95 disabled:opacity-70"
                  disabled={isSpinning}
                >
                  <Shuffle className="h-4 w-4" />
                  랜덤 투표
                </button>
              )}

              {!showResultsView && (
                <button
                  onClick={onVote}
                  className="flex min-h-[44px] min-w-[150px] items-center justify-center gap-2 rounded-md bg-gradient-to-br from-[#ff8c00] to-[#ff6b00] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:from-[#ff6b00] hover:to-[#ff5500] disabled:opacity-60"
                  disabled={!selectedOptionId || votePending}
                >
                  <Sparkles className="h-4 w-4" />
                  {votePending ? "투표 중..." : "투표 하기"}
                </button>
              )}

              {hasVoted && !isPollClosed && (
                <span className="flex min-h-[44px] min-w-[150px] items-center justify-center rounded-md px-4 py-2.5 text-sm font-semibold text-success">
                  ✓ 투표 완료
                </span>
              )}

              {isPollClosed && (
                <span className="flex min-h-[44px] min-w-[150px] items-center justify-center gap-1 rounded-md px-4 py-2.5 text-sm font-semibold text-destructive">
                  <Lock className="h-4 w-4" />
                  투표 마감
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 rounded-xl border border-border-subtle bg-background/70 px-4 py-3 text-xs text-text-tertiary sm:text-[13px]">
          <span>{timeRemaining ? `남은 시간: ${timeRemaining}` : "기한 없음"}</span>
          {poll.expires_at && <span>마감: {new Date(poll.expires_at).toLocaleString("ko-KR")}</span>}
        </div>
      </div>
    </div>
  );
}
