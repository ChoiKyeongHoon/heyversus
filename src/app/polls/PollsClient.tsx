"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/hooks/useSupabase";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Session } from "@supabase/supabase-js";
import type { PollWithOptions } from "@/lib/types";
import { toast } from "sonner";
import { isPollExpired, formatExpiryDate } from "@/lib/utils";

type PollsClientProps = {
  serverPolls: PollWithOptions[];
};

export default function PollsClient({ serverPolls }: PollsClientProps) {
  const router = useRouter();
  const supabase = useSupabase();
  const [polls, setPolls] = useState(serverPolls);
  const [session, setSession] = useState<Session | null>(null);
  // DB에 기록된, 로그인한 유저의 투표 기록
  const [votedPolls, setVotedPolls] = useState<string[]>(() =>
    serverPolls.filter((p) => p.has_voted).map((p) => p.id)
  );
  // 로컬 스토리지에 기록된, 비로그인 유저의 투표 기록
  const [anonymousVotedPolls, setAnonymousVotedPolls] = useState<string[]>([]);
  const [selectedOptionIds, setSelectedOptionIds] = useState<
    Record<string, string | null>
  >({});

  useEffect(() => {
    // serverPolls prop이 변경될 때마다 내부 상태를 동기화합니다.
    // router.refresh() 등으로 부모 컴포넌트의 데이터가 갱신되면 이 부분이 실행됩니다.
    setPolls(serverPolls);
    setVotedPolls(serverPolls.filter((p) => p.has_voted).map((p) => p.id));
    setSelectedOptionIds({});
  }, [serverPolls]);

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
    // 세션 정보 가져오기 및 인증 상태 변경 감지
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  // 비로그인 사용자일 경우에만 로컬 스토리지에서 투표 기록을 불러옵니다.
  useEffect(() => {
    if (!session) {
      const storedVotes = localStorage.getItem("heyversus-voted-polls");
      if (storedVotes) {
        setAnonymousVotedPolls(JSON.parse(storedVotes));
      }
    }
  }, [session]);

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

    const isAlreadyVoted = session
      ? votedPolls.includes(pollId)
      : anonymousVotedPolls.includes(pollId);

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
        setVotedPolls((current) => [...current, pollId]);
      } else if (error.message.includes("Authentication required")) {
        toast.error("이 투표는 로그인이 필요합니다.");
      } else {
        toast.error("투표 중 오류가 발생했습니다.");
      }
    } else {
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

      // 투표 완료 상태를 기록합니다.
      if (session) {
        setVotedPolls((current) => [...current, pollId]);
      } else {
        const updatedAnonymousVotes = [...anonymousVotedPolls, pollId];
        setAnonymousVotedPolls(updatedAnonymousVotes);
        localStorage.setItem(
          "heyversus-voted-polls",
          JSON.stringify(updatedAnonymousVotes)
        );
      }

      setSelectedOptionIds((prev) => ({
        ...prev,
        [pollId]: null,
      }));
    }
  };

  return (
    <div className="container mx-auto max-w-4xl p-8">
      {/* Main Content */}
      <main>
        <h2 className="text-2xl font-semibold tracking-tight mb-6 text-center">
          진행중인 투표들
        </h2>

        {polls.map((poll) => {
          // 로그인 상태에 따라 투표 여부를 확인합니다.
          const isVoted = session
            ? votedPolls.includes(poll.id)
            : anonymousVotedPolls.includes(poll.id);

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
              className={`bg-panel border border-border rounded-lg shadow-lg overflow-hidden mb-8 ${
                isPollClosed ? "opacity-60" : ""
              }`}
            >
              <div className="p-6">
                <h3 className="text-xl font-semibold text-text-primary mb-2">
                  {poll.question}
                </h3>
                <p className="text-text-secondary mb-6">
                  이 투표에 참여해보세요.
                </p>

                {/* Poll Options */}
                <div className="space-y-3 mb-6">
                  {poll.poll_options.map((option) => {
                    // 각 옵션의 득표율을 계산합니다.
                    const percentage =
                      totalVotes > 0
                        ? Math.round((option.votes / totalVotes) * 100)
                        : 0;

                    return (
                      <div
                        key={option.id}
                        className={`flex items-center justify-between bg-surface p-3 rounded-md border ${
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
                        <div className="flex items-center">
                          {option.image_url && (
                            <div className="relative w-12 h-12 mr-4 rounded-md overflow-hidden">
                              <Image
                                src={option.image_url}
                                alt={option.text}
                                fill
                                sizes="48px"
                                style={{ objectFit: 'cover' }}
                              />
                            </div>
                          )}
                          <h3 className="text-text-primary">{option.text}</h3>
                        </div>
                        <span className="text-text-tertiary">
                          {isVoted || isPollClosed
                            ? `${option.votes} votes (${percentage}%)`
                            : `${option.votes} votes`}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Buttons */}
                <div className="flex items-center space-x-4">
                  {!isVoted && !isPollClosed && (
                    <button
                      onClick={() => handleVote(poll.id)}
                      className="bg-primary hover:bg-primary-hover text-white font-semibold py-2 px-4 rounded-md transition-colors duration-200"
                      disabled={!selectedOptionIdForPoll} // Disable if no option is selected
                    >
                      투표하기
                    </button>
                  )}
                  {isVoted && !isPollClosed && (
                    <span className="text-success font-semibold py-2 px-4">
                      ✓ 투표 완료
                    </span>
                  )}
                  <Link
                    href={`/poll/${poll.id}`}
                    className="bg-transparent border border-border hover:bg-panel-hover text-text-secondary font-semibold py-2 px-4 rounded-md transition-colors duration-200"
                  >
                    결과 보기
                  </Link>
                </div>
              </div>
              <div className="bg-background-subtle px-6 py-3 border-t border-border">
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
          );
        })}
      </main>
    </div>
  );
}
