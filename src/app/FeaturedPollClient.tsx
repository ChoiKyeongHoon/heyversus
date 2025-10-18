"use client";

import { Session } from "@supabase/supabase-js";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { STORAGE_KEYS } from "@/constants/storage";
import { useSupabase } from "@/hooks/useSupabase";
import type { PollWithOptions } from "@/lib/types";
import { formatExpiryDate } from "@/lib/utils";

// useSession 훅을 위한 임시 구현
const useSession = () => {
  const [session, setSession] = useState<Session | null>(null);
  const supabase = useSupabase();

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  return { session };
};

interface PollCardProps {
  poll: PollWithOptions;
}

function PollCard({ poll: initialPoll }: PollCardProps) {
  const [poll, setPoll] = useState(initialPoll);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error] = useState<string | null>(null);

  const { session } = useSession();
  const [hasVoted, setHasVoted] = useState(initialPoll.has_voted || false);
  const [isStatusLoading, setIsStatusLoading] = useState(true);

  const router = useRouter();
  const supabase = useSupabase();

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router]);

  useEffect(() => {
    // initialPoll prop이 변경될 때마다 내부 상태를 동기화합니다.
    setPoll(initialPoll);

    if (session) {
      setHasVoted(initialPoll.has_voted || false);
    } else {
      const votedPolls = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.VOTED_POLLS) || "[]"
      );
      setHasVoted(votedPolls.includes(initialPoll.id));
    }
  }, [initialPoll, session]);

  useEffect(() => {
    // 로그인 상태가 확정된 후 투표 상태를 결정
    if (session) {
      // 로그인 사용자는 서버에서 내려준 has_voted 값을 신뢰
      setHasVoted(initialPoll.has_voted || false);
    } else {
      // 비로그인 사용자는 localStorage 확인
      const votedPolls = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.VOTED_POLLS) || "[]"
      );
      if (votedPolls.includes(poll.id)) {
        setHasVoted(true);
      } else {
        setHasVoted(false);
      }
    }
    setIsStatusLoading(false);
  }, [poll.id, initialPoll.has_voted, session]);

  const getTimeRemaining = (expiresAt: string | null): string => {
    if (!expiresAt) return "기간 설정 없음";
    const expiryDate = new Date(expiresAt);
    if (Number.isNaN(expiryDate.getTime())) {
      return expiresAt;
    }
    const now = new Date();
    const diff = expiryDate.getTime() - now.getTime();

    if (diff <= 0) return "마감됨";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > 0) return `${days}일 남음`;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours > 0) return `${hours}시간 남음`;

    const minutes = Math.floor(diff / (1000 * 60));
    return `${minutes}분 남음`;
  };

  const handleSelectOption = (optionId: string) => {
    setSelectedOption(optionId);
  };

  const handleVote = async () => {
    if (!selectedOption) {
      toast.error("투표할 항목을 선택해주세요.");
      return;
    }
    setIsSubmitting(true);

    try {
      const { error: rpcError } = await supabase.rpc("increment_vote", {
        option_id_to_update: selectedOption,
        poll_id_for_vote: poll.id,
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      // 비로그인 사용자를 위해 로컬 스토리지에 기록
      if (!session) {
        const votedPolls = JSON.parse(
          localStorage.getItem(STORAGE_KEYS.VOTED_POLLS) || "[]"
        );
        if (!votedPolls.includes(poll.id)) {
          votedPolls.push(poll.id);
          localStorage.setItem(
            STORAGE_KEYS.VOTED_POLLS,
            JSON.stringify(votedPolls)
          );
        }
      }

      toast.success("투표 성공! 결과 페이지로 이동합니다.");
      router.push(`/poll/${poll.id}`);
    } catch (e: unknown) {
      const errorMessage =
        e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.";
      if (errorMessage.includes("User has already voted")) {
        toast.warning("이미 이 투표에 참여했습니다.");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalVotes = poll.poll_options.reduce(
    (acc, option) => acc + option.votes,
    0
  );
  const isPollClosed =
    poll.status === "closed" ||
    (poll.expires_at && new Date(poll.expires_at) < new Date());

  return (
    <div
      className={`bg-panel border border-border rounded-lg shadow-lg overflow-hidden ${
        isPollClosed ? "opacity-60" : ""
      }`}
    >
      <div className="p-6 border-b border-border">
        <h3 className="text-2xl font-bold text-text-primary mb-2 text-center">
          {poll.question}
        </h3>
        <p className="text-text-secondary text-center">
          {isPollClosed
            ? "투표가 마감되었습니다."
            : "당신의 선택은 무엇인가요?"}
        </p>
      </div>

      <div className="p-6 relative">
        <div
          className={`grid gap-8 ${
            poll.poll_options.length === 2 ? "grid-cols-2" : "grid-cols-3"
          } items-center`}
        >
          {poll.poll_options.map((option) => {
            const percentage =
              totalVotes > 0
                ? Math.round((option.votes / totalVotes) * 100)
                : 0;
            return (
              <div
                key={option.id}
                className="text-center"
                onClick={() =>
                  !isPollClosed && !hasVoted && handleSelectOption(option.id)
                }
              >
                <div
                  className={`group transform transition-all duration-300 ${
                    !isPollClosed && !hasVoted
                      ? "cursor-pointer hover:scale-105"
                      : "cursor-not-allowed"
                  }`}
                >
                  <div
                    className={`relative w-full h-48 mb-4 rounded-lg overflow-hidden shadow-lg border-4 transition-colors ${
                      selectedOption === option.id
                        ? "border-orange-500"
                        : "border-transparent"
                    }`}
                  >
                    {option.image_url ? (
                      <Image
                        src={option.image_url}
                        alt={option.text || ""}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                        <span className="text-4xl font-bold text-primary">
                          ?
                        </span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded-md text-sm">
                      {hasVoted || isPollClosed
                        ? `${option.votes} 표 (${percentage}%)`
                        : `${option.votes} 표`}
                    </div>
                  </div>
                  <h4 className="text-lg font-semibold text-text-primary mb-2">
                    {option.text}
                  </h4>
                  <p className="text-sm text-text-secondary">
                    {option.description || "이 옵션에 투표해보세요!"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* VS Separators */}
        {poll.poll_options.length === 2 && (
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="bg-primary text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg">
              <span className="text-xl font-bold">VS</span>
            </div>
          </div>
        )}
        {poll.poll_options.length === 3 && (
          <>
            <div className="absolute top-1/2 left-1/3 transform -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="bg-primary text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg">
                <span className="text-sm font-bold">VS</span>
              </div>
            </div>
            <div className="absolute top-1/2 right-1/3 transform translate-x-1/2 -translate-y-1/2 z-10">
              <div className="bg-primary text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg">
                <span className="text-sm font-bold">VS</span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="p-6 bg-background-subtle">
        {error && (
          <p className="text-red-500 text-sm text-center mb-4">{error}</p>
        )}
        <div className="flex items-center justify-center space-x-4">
          {isStatusLoading ? (
            <button
              disabled
              className="bg-gray-400 text-white font-semibold py-3 px-6 rounded-md transition-colors duration-200 text-lg cursor-not-allowed"
            >
              확인 중...
            </button>
          ) : isPollClosed ? (
            <span className="text-text-secondary font-semibold py-3 px-6 flex items-center">
              마감됨
            </span>
          ) : hasVoted ? (
            <span className="text-green-600 font-semibold py-3 px-6 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
              투표 완료
            </span>
          ) : (
            <button
              onClick={handleVote}
              disabled={isSubmitting || !selectedOption}
              className="bg-primary hover:bg-primary-hover text-white font-semibold py-3 px-6 rounded-md transition-colors duration-200 text-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "투표 중..." : "투표하기"}
            </button>
          )}
          <Link
            href={`/poll/${poll.id}`}
            className="bg-transparent border border-border hover:bg-panel-hover text-text-secondary font-semibold py-3 px-6 rounded-md transition-colors duration-200"
          >
            결과 보기
          </Link>
        </div>
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex justify-between items-center">
            <p className="text-sm text-text-tertiary">
              {getTimeRemaining(poll.expires_at)}
            </p>
            <p className="text-sm text-text-tertiary">
              마감: {formatExpiryDate(poll.expires_at)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface FeaturedPollClientProps {
  polls: PollWithOptions[];
}

export default function FeaturedPollClient({ polls }: FeaturedPollClientProps) {
  if (!polls || polls.length === 0) {
    return (
      <div className="text-center py-10 px-4 border-2 border-dashed border-border rounded-lg">
        <p className="text-text-secondary">
          현재 진행중인 주목받는 투표가 없습니다.
        </p>
        <p className="text-text-tertiary text-sm mt-2">
          관리자가 투표를 추천할 때까지 기다려주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {polls.map((poll) => (
        <PollCard key={poll.id} poll={poll} />
      ))}
    </div>
  );
}
