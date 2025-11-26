"use client";

import { CheckCircle, Lock, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { PollWithOptions } from "@/lib/types";
import { cn } from "@/lib/utils";

import { FavoriteToggle } from "./FavoriteToggle";

interface PollCardProps {
  poll: PollWithOptions;
  isPollClosed: boolean;
  hasVoted: boolean;
  totalVotes: number;
  selectedOptionId?: string | null;
  onSelectOption?: (_optionId: string) => void;
  onVote?: () => void;
  onToggleFavorite?: () => void;
  favoritePending?: boolean;
  canFavorite?: boolean;
  isFavorited?: boolean;
  timeRemaining: string;
  /** 리스트에서는 투표 불가(read-only) 모드로 표시 */
  interactive?: boolean;
  className?: string;
  variant?: "default" | "grid";
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
  interactive = true,
  className,
  variant = "default",
}: PollCardProps) {
  const router = useRouter();
  const showResults = hasVoted || isPollClosed;
  const canInteract = interactive && !showResults;
  const isGridVariant = variant === "grid";
  const status = isPollClosed ? "closed" : hasVoted ? "voted" : "open";
  const displayedOptions = poll.poll_options.slice(0, 6);
  const hiddenOptionCount = poll.poll_options.length - displayedOptions.length;
  const statusMeta =
    status === "closed"
      ? {
          label: "투표 마감",
          helper: "결과만 확인 가능",
          tone: "danger" as const,
          Icon: Lock,
        }
      : status === "voted"
        ? {
            label: "이미 참여",
            helper: "상세에서 결과 확인",
            tone: "success" as const,
            Icon: CheckCircle,
          }
        : {
            label: "투표 참여",
            helper: "상세에서 투표/결과 확인",
            tone: "brand" as const,
            Icon: Sparkles,
          };

  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-2xl border border-border/60 bg-panel shadow-sm transition hover:border-primary/40 hover:shadow-xl",
        isGridVariant && "bg-background-subtle/70",
        className
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-4 py-3 text-xs font-semibold uppercase tracking-wider text-text-tertiary",
          isGridVariant && "px-3.5 py-2.5 text-[11px]"
        )}
      >
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
        <div className="flex items-center gap-2 text-[11px] text-text-secondary">
          <span>총 {totalVotes.toLocaleString()}표</span>
          <FavoriteToggle
            isFavorited={Boolean(isFavorited)}
            pending={favoritePending}
            onToggle={onToggleFavorite}
            redirectPath={`/poll/${poll.id}`}
            size="sm"
          />
        </div>
      </div>
      <div className={cn("flex flex-1 flex-col p-4 md:p-6", isGridVariant && "p-4 md:p-5")}>
        <header className={cn("mb-4 flex flex-col gap-2", isGridVariant && "mb-3 gap-1.5")}>
          <Link
            href={`/poll/${poll.id}`}
            className={cn(
              "text-base font-semibold text-text-primary transition hover:text-primary md:text-lg",
              isGridVariant && "line-clamp-2 leading-snug"
            )}
          >
            {poll.question}
          </Link>
          <p className={cn("text-sm text-text-secondary", isGridVariant && "text-xs text-text-tertiary")}>
            진행 상태를 확인하고 의견을 공유해보세요.
          </p>
        </header>

        <div className={cn("space-y-2.5", isGridVariant && "space-y-2")}>
          {poll.poll_options.map((option) => (
            <div
              key={option.id}
              className={cn(
                "grid grid-cols-[auto,1fr] items-center gap-3 rounded-xl border px-3 py-3 text-left transition",
                "border-border-subtle bg-background-subtle",
                "hover:border-primary/40 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/50",
                isGridVariant && "rounded-lg px-3 py-2.5"
              )}
              tabIndex={0}
            >
              {option.image_url ? (
                <div
                  className={cn(
                    "flex items-center justify-center overflow-hidden rounded-lg",
                    isGridVariant ? "h-11 w-11" : "h-12 w-12"
                  )}
                >
                  <div className="relative h-full w-full">
                    <Image
                      src={option.image_url}
                      alt={option.text}
                      fill
                      quality={70}
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                </div>
              ) : (
                <div
                  className={cn(
                    "flex items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary",
                    isGridVariant ? "h-11 w-11" : "h-12 w-12"
                  )}
                >
                  VS
                </div>
              )}
              <div className="flex flex-1 flex-col space-y-1 border-l border-border-subtle pl-3">
                <span className={cn("text-sm font-semibold text-text-primary", isGridVariant && "leading-snug")}>
                  {option.text}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div
          className={cn(
            "mt-auto space-y-3 pt-4",
            isGridVariant && "space-y-2.5 pt-3"
          )}
        >
          <p
            className={cn(
              "text-center text-xs text-text-tertiary",
              isGridVariant && "text-[11px]"
            )}
          >
            결과 확인과 투표는 아래 버튼을 눌러 진행해 주세요.
          </p>
          <div
            className={cn(
              "flex flex-col items-stretch justify-center",
              isGridVariant && "gap-2 sm:items-center"
            )}
          >
            {(() => {
              const content = (
                <div className="flex w-full flex-col items-center justify-center text-center">
                  <div className="flex items-center gap-1.5 text-sm font-semibold">
                    <statusMeta.Icon className={cn("h-4 w-4", isGridVariant && "h-3.5 w-3.5")} />
                    <span>{statusMeta.label}</span>
                  </div>
                </div>
              );

              const baseClass = cn(
                "w-full justify-center text-sm font-semibold sm:w-auto sm:min-w-[136px] sm:max-w-[210px] mx-auto min-h-[48px] px-3 py-2",
                statusMeta.tone === "brand" &&
                  "border-transparent bg-gradient-to-br from-[#ff8c00] to-[#ff6b00] text-white shadow-md hover:from-[#ff6b00] hover:to-[#ff5500]",
                statusMeta.tone === "success" &&
                  "border border-success/40 bg-success/10 text-success",
                statusMeta.tone === "danger" &&
                  "border border-destructive/40 bg-destructive/10 text-destructive",
                isGridVariant && "h-auto min-h-[44px] rounded-lg text-xs sm:min-w-[120px]"
              );

              if (canInteract && status === "open" && onVote) {
                return (
                  <Button
                    onClick={onVote}
                    disabled={!selectedOptionId}
                    className={baseClass}
                  >
                    {content}
                  </Button>
                );
              }

              return (
                <Button asChild className={baseClass} variant="outline">
                  <Link href={`/poll/${poll.id}`}>{content}</Link>
                </Button>
              );
            })()}
          </div>

          <div
            className={cn(
              "flex flex-col items-center justify-center gap-2 text-center text-xs text-text-tertiary sm:flex-row sm:gap-3",
              isGridVariant && "flex-wrap text-[11px]"
            )}
          >
            <span>
              {poll.expires_at ? `마감: ${new Date(poll.expires_at).toLocaleString("ko-KR")}` : "기한 없음"}
            </span>
            {/* 즐겨찾기는 상단 메타 영역 아이콘으로 이동 */}
          </div>
        </div>
      </div>
    </div>
  );
}
