"use client";

import { Star } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { STORAGE_KEYS } from "@/constants/storage";
import { usePollVote } from "@/hooks/usePollVote";
import { useToggleFavorite } from "@/hooks/useToggleFavorite";
import { useVisibilityChange } from "@/hooks/useVisibilityChange";
import { getToast } from "@/lib/toast";
import type { PollWithOptions } from "@/lib/types";
import { formatExpiryDate, isPollExpired } from "@/lib/utils";

interface PollClientProps {
  poll: PollWithOptions;
  onRefresh?: () => void;
}

export default function PollClient({ poll, onRefresh }: PollClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const voteMutation = usePollVote({
    onSuccess: () => {
      onRefresh?.();
    },
  });
  const toggleFavoriteMutation = useToggleFavorite();
  // `has_voted`는 서버에서 내려온, 로그인 사용자의 투표 여부입니다.
  const [isVoted, setIsVoted] = useState(poll.has_voted || false);
  const [isFavorited, setIsFavorited] = useState(Boolean(poll.is_favorited));
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isRouletteOpen, setIsRouletteOpen] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinRotation, setSpinRotation] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [rouletteResultOptionId, setRouletteResultOptionId] = useState<
    string | null
  >(null);
  const [isSpinTransitionEnabled, setIsSpinTransitionEnabled] = useState(true);
  const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ROULETTE_ANIMATION_MS = 5000;
  const ROULETTE_COOLDOWN_MS = 1000;
  const ROULETTE_BASE_ROTATIONS = 8; // 회전 횟수(기본 회전수 + 랜덤 오프셋)

  // 탭 전환 시 자동 새로고침
  useVisibilityChange(() => {
    onRefresh?.();
  });

  // poll prop이 변경될 때마다 내부 상태를 동기화합니다.
  useEffect(() => {
    setIsFavorited(Boolean(poll.is_favorited));
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

  const handleFavoriteToggle = () => {
    if (toggleFavoriteMutation.isPending) return;
    const currentPath = pathname || `/poll/${poll.id}`;

    toggleFavoriteMutation.mutate(
      { pollId: poll.id },
      {
        onSuccess: async ({ isFavorited }) => {
          setIsFavorited(isFavorited);
          const toast = await getToast();
          toast.success(
            isFavorited
              ? "즐겨찾기에 추가되었습니다."
              : "즐겨찾기에서 제거했습니다."
          );
        },
        onError: async (error) => {
          const toast = await getToast();
          const message =
            error instanceof Error
              ? error.message
              : typeof error === "string"
                ? error
                : "";
          if (message.includes("Authentication required")) {
            toast.error("다시 로그인한 후 즐겨찾기를 사용할 수 있습니다.");
            router.push(`/signin?redirect=${encodeURIComponent(currentPath)}`);
          } else {
            toast.error("즐겨찾기 처리 중 오류가 발생했습니다.");
          }
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
  const isPollClosed =
    poll.status === "closed" || isPollExpired(poll.expires_at);

  const rouletteGradient = useMemo(() => {
    if (!poll.poll_options.length) {
      return "conic-gradient(#6366f1 0deg, #6366f1 360deg)";
    }
    const segments = poll.poll_options.map((_, index) => {
      const start = (index / poll.poll_options.length) * 100;
      const end = ((index + 1) / poll.poll_options.length) * 100;
      const hue = (index * 57) % 360;
      return `hsl(${hue} 75% 60%) ${start}% ${end}%`;
    });
    return `conic-gradient(${segments.join(", ")})`;
  }, [poll.poll_options]);

  const rouletteResultOption = useMemo(
    () =>
      poll.poll_options.find((option) => option.id === rouletteResultOptionId),
    [rouletteResultOptionId, poll.poll_options]
  );
  const showRouletteTrigger =
    !isVoted && !isPollClosed && poll.poll_options.length > 1;
  const cooldownRemaining = cooldownUntil
    ? Math.max(0, cooldownUntil - Date.now())
    : 0;

  const handleRouletteOpen = () => {
    setIsRouletteOpen(true);
    setIsSpinning(false);
  };

  const handleRouletteClose = () => {
    setIsRouletteOpen(false);
    setIsSpinning(false);
  };

  const handleRouletteSpin = async () => {
    if (isSpinning || poll.poll_options.length <= 1) return;

    if (cooldownRemaining > 0) {
      const toast = await getToast();
      toast.info(
        `${Math.ceil(cooldownRemaining / 1000)}초 뒤에 다시 돌릴 수 있어요.`
      );
      return;
    }

    const randomIndex = Math.floor(Math.random() * poll.poll_options.length);
    const sliceAngle = 360 / poll.poll_options.length;
    const targetRotation =
      360 * ROULETTE_BASE_ROTATIONS +
      (360 - (randomIndex * sliceAngle + sliceAngle / 2));

    setRouletteResultOptionId(null);
    setIsSpinning(true);
    // 이전 회전값을 전환 없이 초기화한 뒤 다시 애니메이션을 켠 상태로 회전
    setIsSpinTransitionEnabled(false);
    setSpinRotation((prev) => prev % 360);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsSpinTransitionEnabled(true);
        setSpinRotation(targetRotation);
      });
    });

    if (spinTimeoutRef.current) {
      clearTimeout(spinTimeoutRef.current);
    }

    spinTimeoutRef.current = setTimeout(async () => {
      const chosenOption = poll.poll_options[randomIndex];
      setIsSpinning(false);
      setRouletteResultOptionId(chosenOption.id);
      setSelectedOptionId(chosenOption.id);
      setCooldownUntil(Date.now() + ROULETTE_COOLDOWN_MS);
      const toast = await getToast();
      toast.success(
        `"${chosenOption.text}" 옵션이 당첨! 투표하기 버튼을 눌러주세요.`
      );
    }, ROULETTE_ANIMATION_MS);
  };

  useEffect(
    () => () => {
      if (spinTimeoutRef.current) {
        clearTimeout(spinTimeoutRef.current);
      }
    },
    []
  );

  useEffect(() => {
    setSelectedOptionId(null);
    setRouletteResultOptionId(null);
    setIsRouletteOpen(false);
    setIsSpinning(false);
    setCooldownUntil(null);
  }, [poll.id]);

  useEffect(() => {
    if (!cooldownUntil) return;
    const timeoutId = setTimeout(() => {
      setCooldownUntil(null);
    }, Math.max(0, cooldownUntil - Date.now()));
    return () => clearTimeout(timeoutId);
  }, [cooldownUntil]);

  const hasRouletteResult = Boolean(rouletteResultOptionId);
  const showResultsView = isVoted || isPollClosed;
  const timeRemainingLabel = getTimeRemaining(poll.expires_at);
  const showVoteButton = !isVoted && !isPollClosed && !voteMutation.isPending;
  const showVoteComplete = isVoted && !isPollClosed;
  const showVotingState = voteMutation.isPending;

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
            <p
              className={`text-2xl font-bold ${
                isPollClosed ? "text-destructive" : "text-primary"
              }`}
            >
              {isPollClosed ? "마감됨" : "진행 중"}
            </p>
            <p className="text-xs text-text-secondary">
              {isPollClosed
                ? "결과가 확정되었습니다."
                : "지금 참여해서 의견을 남겨보세요."}
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

        <div
          className={`rounded-3xl border border-border bg-panel/60 shadow-inner ${
            isPollClosed ? "opacity-60" : ""
          }`}
        >
          <div className="flex flex-wrap items-center justify-between border-b border-border-subtle px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-tertiary sm:text-xs">
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
                  {timeRemainingLabel || "진행 중"}
                </span>
              )}
            </div>
            <div className="text-text-secondary text-[11px] sm:text-xs">
              총 {totalVotes.toLocaleString()}표
            </div>
          </div>

          <div className="p-4 md:p-6 space-y-6">
            <header className="space-y-2">
              <h3 className="text-xl font-semibold text-text-primary md:text-2xl">
                {poll.question}
              </h3>
              <p className="text-sm md:text-base text-text-secondary">
                {isPollClosed ? "결과를 확인하세요." : "이 투표에 참여해보세요."}
              </p>
            </header>

            {/* Poll Options / Results */}
            <div className="space-y-2 md:space-y-3 mb-4 md:mb-6">
              {!showResultsView && rouletteResultOption && (
                <div className="flex items-center gap-2 rounded-md bg-primary/5 px-3 py-2 text-sm text-primary">
                  <span className="font-semibold">돌림판 결과</span>
                  <span className="truncate">
                    {rouletteResultOption.text} (자동 선택됨)
                  </span>
                </div>
              )}
              <div className="space-y-2">
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
                        setSelectedOptionId(option.id);
                        if (
                          rouletteResultOptionId &&
                          rouletteResultOptionId !== option.id
                        ) {
                          setRouletteResultOptionId(null);
                        }
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${baseClasses} ${
                        isRouletteHighlight ? "ring-1 ring-primary/40" : ""
                      }`}
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
                      <div className="flex flex-1 flex-col min-w-0">
                        <span className="text-sm md:text-base font-semibold text-text-primary truncate">
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
                          className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                            isSelected
                              ? "border-primary text-primary"
                              : "border-border text-text-tertiary"
                          }`}
                        >
                          선택
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {isVoted && !isPollClosed && (
                <p className="text-center text-success text-sm font-semibold">
                  투표에 참여해주셔서 감사합니다!
                </p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-center gap-2 sm:gap-4 text-center">
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
              {showVoteComplete && (
                <button
                  type="button"
                  onClick={() => router.push("/polls")}
                  className="border-2 border-transparent bg-gradient-to-r from-brand-orange to-brand-gold text-transparent bg-clip-text font-semibold py-2.5 px-4 rounded-md transition-all duration-200 text-sm md:text-base min-h-[44px] flex items-center justify-center"
                  style={{ borderImage: "linear-gradient(to right, var(--brand-orange), var(--brand-gold)) 1" }}
                >
                  다른 투표들
                </button>
              )}
              {showRouletteTrigger && (
                <button
                  type="button"
                  onClick={handleRouletteOpen}
                  className="bg-gradient-to-br from-brand-gold/90 via-brand-gold to-brand-gold/80 text-white font-semibold py-2.5 px-4 rounded-md transition-all duration-200 text-sm md:text-base min-h-[44px] shadow-md hover:brightness-95 disabled:opacity-70"
                  disabled={isSpinning}
                >
                  랜덤 투표
                </button>
              )}
              {showVoteButton && (
                <button
                  onClick={() => handleVote(selectedOptionId!)}
                  className="bg-gradient-to-br from-[#ff8c00] to-[#ff6b00] text-white font-semibold py-2.5 px-4 rounded-md transition-all duration-200 text-sm md:text-base min-h-[44px] shadow-md hover:from-[#ff6b00] hover:to-[#ff5500] disabled:opacity-60"
                  disabled={!selectedOptionId}
                >
                  투표하기
                </button>
              )}
              {showVoteComplete && (
                <span className="text-success font-semibold py-2.5 px-4 text-sm md:text-base min-h-[44px] flex items-center">
                  ✓ 투표 완료
                </span>
              )}
              {showVotingState && (
                <span className="text-text-secondary font-semibold py-2.5 px-4 text-sm md:text-base min-h-[44px] flex items-center">
                  투표 중...
                </span>
              )}
            </div>

          </div>
          <div className="border-t border-border-subtle px-4 md:px-6 py-3 text-xs sm:text-[13px]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1 text-text-tertiary">
                <span>
                  {timeRemainingLabel ? `남은 시간: ${timeRemainingLabel}` : "기한 없음"}
                </span>
                {poll.expires_at && (
                  <span>마감: {formatExpiryDate(poll.expires_at)}</span>
                )}
              </div>
              <button
                type="button"
                onClick={handleFavoriteToggle}
                disabled={toggleFavoriteMutation.isPending}
                aria-pressed={isFavorited}
                className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  isFavorited
                    ? "border-brand-gold text-brand-gold"
                    : "border-border text-text-secondary hover:text-text-primary"
                } ${toggleFavoriteMutation.isPending ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <Star
                  className="h-3.5 w-3.5"
                  fill={isFavorited ? "currentColor" : "none"}
                />
                {isFavorited ? "즐겨찾기" : "즐겨찾기 추가"}
              </button>
            </div>
          </div>
        </div>
      </main>

      {isRouletteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-xl rounded-2xl border border-border bg-panel shadow-2xl">
            <button
              type="button"
              aria-label="닫기"
              onClick={handleRouletteClose}
              className="absolute right-3 top-3 text-text-secondary hover:text-text-primary"
            >
              ×
            </button>
            <div className="p-5 md:p-6 space-y-5">
              <div className="space-y-1 text-center">
                <h2 className="text-lg md:text-xl font-semibold text-text-primary">
                  돌림판으로 옵션 추천
                </h2>
                <p className="text-sm text-text-secondary">
                  자동 투표는 하지 않아요. 추천된 옵션을 직접 투표하기로
                  확정해주세요.
                </p>
              </div>

              <div className="flex flex-col items-center gap-4">
                <div className="relative h-56 w-56 md:h-64 md:w-64 flex items-center justify-center">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 h-0 w-0 border-l-[10px] border-r-[10px] border-b-[14px] border-b-primary" />
                  <div className="relative h-full w-full rounded-full border border-border bg-background-subtle shadow-inner overflow-hidden">
                    <div
                      className="absolute inset-0 transition-transform"
                      style={{
                        background: rouletteGradient,
                        transform: `rotate(${spinRotation}deg)`,
                        transitionTimingFunction: "cubic-bezier(0.12, 0.74, 0.05, 1)",
                        transitionDuration: `${
                          isSpinTransitionEnabled ? ROULETTE_ANIMATION_MS : 0
                        }ms`,
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="rounded-full border border-border bg-background/90 px-3 py-1 text-xs text-text-secondary">
                        행운을 빕니다!
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid w-full grid-cols-1 sm:grid-cols-2 gap-2">
                  {poll.poll_options.map((option, index) => (
                    <div
                      key={option.id}
                      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                        rouletteResultOptionId === option.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border-subtle bg-surface text-text-primary"
                      }`}
                    >
                      <span className="text-xs text-text-tertiary">
                        #{index + 1}
                      </span>
                      <span className="truncate">{option.text}</span>
                    </div>
                  ))}
                </div>

                <div className="w-full space-y-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={handleRouletteSpin}
                      className="w-full sm:flex-[2] rounded-md bg-primary py-3 text-sm md:text-base font-semibold text-white transition-colors duration-200 hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-border"
                      disabled={isSpinning || cooldownRemaining > 0}
                    >
                      {isSpinning
                        ? "돌리는 중..."
                        : cooldownRemaining > 0
                          ? `${Math.ceil(cooldownRemaining / 1000)}초 뒤 재시도`
                          : "돌리기"}
                    </button>
                    <button
                      type="button"
                      onClick={handleRouletteClose}
                      className={`w-full sm:flex-1 rounded-md py-3 text-sm md:text-base font-semibold transition-colors duration-200 ${
                        hasRouletteResult
                          ? "bg-success text-white hover:bg-success/90"
                          : "border border-border-subtle bg-surface text-text-primary hover:bg-panel-hover"
                      }`}
                    >
                      {hasRouletteResult ? "확인" : "닫기"}
                    </button>
                  </div>
                  <p className="text-center text-xs text-text-secondary">
                    추천된 옵션을 확인한 뒤 투표하기 버튼을 눌러주세요. (자동
                    투표하지 않아요)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
