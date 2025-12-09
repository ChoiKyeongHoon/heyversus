import { useMutation, useQueryClient } from "@tanstack/react-query";

import { submitVoteRequest } from "@/lib/api/vote";
import { logScoreEventClient } from "@/lib/services/scoreEvents";
import { getToast } from "@/lib/toast";
import type { PollWithOptions } from "@/lib/types";

import { useSupabase } from "./useSupabase";

interface UsePollVoteOptions {
  onSuccess?: () => void;
}

interface VoteParams {
  pollId: string;
  optionId: string;
}

type VoteContext = {
  previousPoll?: PollWithOptions;
};

export function usePollVote(options: UsePollVoteOptions = {}) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, VoteParams, VoteContext>({
    mutationFn: async ({ pollId, optionId }: VoteParams) =>
      submitVoteRequest({ pollId, optionId }),
    onMutate: async ({ pollId, optionId }) => {
      const queryKey = ["poll-detail", pollId];
      const previousPoll = queryClient.getQueryData<PollWithOptions>(queryKey);

      // 비로그인 사용자인 경우 로컬 스토리지에 기록
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        const storedVotes = localStorage.getItem("heyversus-voted-polls");
        const votedPolls: string[] = storedVotes
          ? JSON.parse(storedVotes)
          : [];
        if (!votedPolls.includes(pollId)) {
          votedPolls.push(pollId);
          localStorage.setItem(
            "heyversus-voted-polls",
            JSON.stringify(votedPolls)
          );
        }
      }

      // Optimistic update: detail 캐시를 즉시 증가시켜 사용자에게 반영
      if (previousPoll) {
        const updatedPoll: PollWithOptions = {
          ...previousPoll,
          has_voted: true,
          poll_options: previousPoll.poll_options.map((option) =>
            option.id === optionId
              ? { ...option, votes: (option.votes || 0) + 1 }
              : option
          ),
        };
        queryClient.setQueryData(queryKey, updatedPoll);
      }

      return { previousPoll };
    },
    onError: async (error: Error, { pollId }, context) => {
      if (context?.previousPoll) {
        queryClient.setQueryData(["poll-detail", pollId], context.previousPoll);
      }

      console.error("Error voting:", error);
      const toast = await getToast();

      if (error.message?.includes("User has already voted")) {
        toast.warning("이미 이 투표에 참여했습니다.");
      } else if (error.message?.includes("Authentication required")) {
        toast.error("이 투표는 로그인이 필요합니다.");
      } else {
        toast.error("투표 중 오류가 발생했습니다.");
      }
    },
    onSuccess: async (_data, variables) => {
      const toast = await getToast();
      toast.success("투표가 완료되었습니다!");
      // 점수 이벤트 기록 (로그인 사용자만)
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session && variables?.pollId) {
        const { error: scoreEventError } = await logScoreEventClient({
          eventType: "vote",
          pollId: variables.pollId,
        });

        if (scoreEventError) {
          console.error("Failed to log vote score event:", scoreEventError);
        }
      }
      options.onSuccess?.();
    },
  });
}
