"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { PollDetailCard } from "@/components/polls/PollDetailCard";
import { STORAGE_KEYS } from "@/constants/storage";
import { usePollVote } from "@/hooks/usePollVote";
import { useSession } from "@/hooks/useSession";
import { useToggleFavorite } from "@/hooks/useToggleFavorite";
import { useVisibilityChange } from "@/hooks/useVisibilityChange";
import { getToast } from "@/lib/toast";
import type { PollWithOptions } from "@/lib/types";
import { isPollExpired } from "@/lib/utils";

interface PollClientProps {
  poll: PollWithOptions;
  onRefresh?: () => void;
}

export default function PollClient({ poll, onRefresh }: PollClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { session } = useSession();
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

  const handleFavoriteToggle = (redirectOnUnauthed = true) => {
    if (!session) {
      if (redirectOnUnauthed) {
        router.push(`/signin?redirect=${encodeURIComponent(pathname || `/poll/${poll.id}`)}`);
      }
      return;
    }
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

  const handleShareLink = async () => {
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

  const timeRemainingLabel = getTimeRemaining(poll.expires_at);

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

        <PollDetailCard
          poll={poll}
          totalVotes={totalVotes}
          isPollClosed={isPollClosed}
          hasVoted={isVoted}
          timeRemaining={timeRemainingLabel}
          selectedOptionId={selectedOptionId}
          rouletteResultOptionId={rouletteResultOptionId}
          onSelectOption={(optionId) => {
            setSelectedOptionId(optionId);
            if (rouletteResultOptionId && rouletteResultOptionId !== optionId) {
              setRouletteResultOptionId(null);
            }
          }}
          onVote={() => selectedOptionId && handleVote(selectedOptionId)}
          votePending={voteMutation.isPending}
          onShare={handleShareLink}
          onBack={() => router.push("/polls")}
          showRouletteTrigger={showRouletteTrigger}
          onRouletteOpen={handleRouletteOpen}
          isSpinning={isSpinning}
          isFavorited={isFavorited}
          favoritePending={toggleFavoriteMutation.isPending}
          canFavorite={Boolean(session)}
          onToggleFavorite={() => handleFavoriteToggle(true)}
        />
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
                  <div className="absolute top-[-11px] left-1/2 z-10 -translate-x-1/2 h-0 w-0 border-l-[10px] border-r-[10px] border-t-[14px] border-l-transparent border-r-transparent border-t-primary" />
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
                        rouletteResultOption
                          ? "bg-success text-white hover:bg-success/90"
                          : "border border-border-subtle bg-surface text-text-primary hover:bg-panel-hover"
                      }`}
                    >
                      {rouletteResultOption ? "확인" : "닫기"}
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
