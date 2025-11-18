"use client";

import { Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { PollWithOptions } from "@/lib/types";

interface PollCardProps {
  poll: PollWithOptions;
  isPollClosed: boolean;
  hasVoted: boolean;
  totalVotes: number;
  selectedOptionId: string | null;
  onSelectOption: (_optionId: string) => void;
  onVote: () => void;
  onToggleFavorite?: () => void;
  favoritePending?: boolean;
  canFavorite?: boolean;
  isFavorited?: boolean;
  timeRemaining: string;
}

export function PollCard({
  poll,
  isPollClosed,
  hasVoted,
  totalVotes,
  selectedOptionId,
  onSelectOption,
  onVote,
  onToggleFavorite,
  favoritePending,
  canFavorite,
  isFavorited,
  timeRemaining,
}: PollCardProps) {
  const showResults = hasVoted || isPollClosed;

  return (
    <div className="rounded-2xl border border-border/60 bg-panel shadow-sm transition hover:border-primary/40 hover:shadow-xl">
      <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
        <div className="flex items-center gap-2">
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
        <div className="text-text-secondary text-[11px]">
          총 {totalVotes.toLocaleString()}표
        </div>
      </div>
      <div className="p-4 md:p-6">
        <header className="mb-4 flex flex-col gap-2">
          <Link
            href={`/poll/${poll.id}`}
            className="text-base font-semibold text-text-primary transition hover:text-primary md:text-lg"
          >
            {poll.question}
          </Link>
          <p className="text-sm text-text-secondary">
            진행 상태를 확인하고 의견을 공유해보세요.
          </p>
        </header>

        <div className="space-y-3">
          {poll.poll_options.map((option) => {
            const percentage =
              totalVotes > 0 ? Math.round(((option.votes || 0) / totalVotes) * 100) : 0;
            const isSelected = selectedOptionId === option.id;
            return (
              <button
                key={option.id}
                type="button"
                disabled={showResults}
                onClick={() => onSelectOption(option.id)}
                className={`relative flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
                  showResults
                    ? "border-transparent bg-background-subtle"
                    : isSelected
                      ? "border-primary bg-primary/10"
                      : "border-border-subtle hover:border-primary/60"
                }`}
              >
                {option.image_url ? (
                  <div className="relative h-12 w-12 overflow-hidden rounded-lg">
                    <Image
                      src={option.image_url}
                      alt={option.text}
                      fill
                      quality={70}
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                    VS
                  </div>
                )}
                <div className="flex flex-1 flex-col">
                  <span className="text-sm font-semibold text-text-primary">
                    {option.text}
                  </span>
                  {showResults ? (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-text-tertiary">
                        <span>{percentage}%</span>
                        <span>{(option.votes || 0).toLocaleString()}표</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-border/50">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-text-secondary">터치해서 선택하세요</span>
                  )}
                </div>
                {!showResults && (
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs ${
                      isSelected ? "border-primary text-primary" : "border-border text-text-tertiary"
                    }`}
                  >
                    선택
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          {!showResults && (
            <Button
              onClick={onVote}
              disabled={!selectedOptionId}
              className="flex-1 text-sm font-semibold"
            >
              투표하기
            </Button>
          )}
          {showResults && (
            <div className="flex flex-1 items-center justify-between rounded-xl border border-border-subtle px-4 py-2 text-sm text-text-secondary">
              <span>{isPollClosed ? "투표 마감" : "이미 참여함"}</span>
              <span className="font-semibold text-success">
                {isPollClosed ? "결과 고정" : "✓"}
              </span>
            </div>
          )}
          <Button variant="outline" asChild className="text-sm font-semibold">
            <Link href={`/poll/${poll.id}`}>자세히 보기</Link>
          </Button>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-text-tertiary">
          <span>{poll.expires_at ? `마감: ${new Date(poll.expires_at).toLocaleString("ko-KR")}` : "기한 없음"}</span>
          {canFavorite && (
            <button
              type="button"
              onClick={onToggleFavorite}
              disabled={favoritePending}
              className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                isFavorited
                  ? "border-yellow-400 text-yellow-400"
                  : "border-border text-text-secondary hover:text-text-primary"
              } ${favoritePending ? "opacity-60" : ""}`}
            >
              <Star className="h-3.5 w-3.5" fill={isFavorited ? "currentColor" : "none"} />
              {isFavorited ? "즐겨찾기" : "즐겨찾기 추가"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
