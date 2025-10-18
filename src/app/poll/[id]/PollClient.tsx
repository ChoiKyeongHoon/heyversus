"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect,useState } from "react";
import { toast } from "sonner";

import { STORAGE_KEYS } from "@/constants/storage";
import { usePollVote } from "@/hooks/usePollVote";
import type { PollWithOptions } from "@/lib/types";
import { formatExpiryDate,isPollExpired } from "@/lib/utils";

interface PollClientProps {
  poll: PollWithOptions;
}

export default function PollClient({ poll }: PollClientProps) {
  const router = useRouter();
  const voteMutation = usePollVote();
  // `has_voted`는 서버에서 내려온, 로그인 사용자의 투표 여부입니다.
  const [isVoted, setIsVoted] = useState(poll.has_voted || false);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        router.refresh();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [router]);

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
  const isPollClosed = poll.status === 'closed' || isPollExpired(poll.expires_at);

  return (
    <div className="container mx-auto max-w-4xl p-8">
      {/* Header */}
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tighter mb-2">
          {poll.question}
        </h1>
        <p className="text-text-secondary text-lg">
          {isPollClosed ? "투표가 마감되었습니다." : "투표에 참여해보세요."}
        </p>
      </header>

      {/* Main Content */}
      <main>
        <div className={`bg-panel border border-border rounded-lg shadow-lg overflow-hidden mb-8 ${isPollClosed ? 'opacity-60' : ''}`}>
          <div className="p-6">
            <h3 className="text-xl font-semibold text-text-primary mb-2">
              {poll.question}
            </h3>
            <p className="text-text-secondary mb-6">
              {isPollClosed ? "결과를 확인하세요." : "이 투표에 참여해보세요."}
            </p>

            {/* Poll Options - Always show results if poll is closed */}
            {(!isVoted && !isPollClosed) && (
              <div className="space-y-3 mb-6">
                {poll.poll_options.map((option) => (
                    <div
                      key={option.id}
                      className={`flex items-center justify-between bg-surface p-3 rounded-md border cursor-pointer hover:bg-panel-hover ${selectedOptionId === option.id ? 'border-primary' : 'border-border-subtle'}`}
                      onClick={() => setSelectedOptionId(option.id)}
                    >
                      <div className="flex items-center">
                        {option.image_url && (
                          <div className="relative w-12 h-12 mr-4 rounded-md overflow-hidden">
                            <Image
                              src={option.image_url}
                              alt={option.text || "Poll option"}
                              fill
                              sizes="48px"
                              style={{ objectFit: 'cover' }}
                            />
                          </div>
                        )}
                        <span className="text-text-primary">{option.text}</span>
                      </div>
                      <span className="text-text-tertiary">
                        {option.votes || 0} votes
                      </span>
                    </div>
                  ))}
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center space-x-4">
              {!isVoted && !isPollClosed && !voteMutation.isPending && (
                <button
                  onClick={() => handleVote(selectedOptionId!)}
                  className="bg-primary hover:bg-primary-hover text-white font-semibold py-2 px-4 rounded-md transition-colors duration-200"
                  disabled={!selectedOptionId}
                >
                  투표하기
                </button>
              )}
              {isVoted && !isPollClosed && (
                <span className="text-success font-semibold py-2 px-4">
                  ✓ 투표 완료
                </span>
              )}
              {voteMutation.isPending && (
                <span className="text-text-secondary font-semibold py-2 px-4">
                  투표 중...
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  const pollUrl = window.location.href;
                  navigator.clipboard
                    .writeText(pollUrl)
                    .then(() => {
                      toast.success("투표 링크가 클립보드에 복사되었습니다!");
                    })
                    .catch((err) => {
                      console.error("Failed to copy link:", err);
                      toast.error("링크 복사에 실패했습니다.");
                    });
                }}
                className="bg-transparent border border-border hover:bg-panel-hover text-text-secondary font-semibold py-2 px-4 rounded-md transition-colors duration-200"
              >
                링크 공유
              </button>
            </div>

            {/* Results Section - Always visible */}
            {true && (
              <div className="mt-6 space-y-3">
                <h3 className="text-lg font-semibold text-text-primary mb-4">
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
          <div className="bg-background-subtle px-6 py-3 border-t border-border">
            <div className="flex justify-center items-center space-x-4">
              <p className="text-sm text-text-tertiary">
                {getTimeRemaining(poll.expires_at)}
              </p>
              <p className="text-sm text-text-tertiary">
                (마감: {formatExpiryDate(poll.expires_at)})
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

