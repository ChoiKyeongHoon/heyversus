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
  previousProfilePoints?: number;
  profileKey?: (string | undefined)[];
};

export function usePollVote(options: UsePollVoteOptions = {}) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, VoteParams, VoteContext>({
    mutationFn: async ({ pollId, optionId }: VoteParams) =>
      submitVoteRequest({ pollId, optionId }),
    onMutate: async ({ pollId, optionId }) => {
      const queryKey = ["poll-detail", pollId];
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const profileKey = session
        ? ["current-profile", session.user.id]
        : ["current-profile"];
      const previousPoll = queryClient.getQueryData<PollWithOptions>(queryKey);
      const previousProfile =
        queryClient.getQueryData<{ points?: number }>(profileKey) ||
        queryClient.getQueryData<{ points?: number }>(["current-profile"]);
      const previousProfilePoints =
        previousProfile?.points !== undefined
          ? Number(previousProfile.points)
          : undefined;

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

      return { previousPoll, previousProfilePoints, profileKey };
    },
    onError: async (error: Error, { pollId }, context) => {
      if (context?.previousPoll) {
        queryClient.setQueryData(["poll-detail", pollId], context.previousPoll);
      }
      if (
        context?.previousProfilePoints !== undefined &&
        context.profileKey
      ) {
        queryClient.setQueryData(context.profileKey, (prev) =>
          prev ? { ...prev, points: context.previousProfilePoints } : prev
        );
        queryClient.setQueryData(["current-profile"], (prev) =>
          prev ? { ...prev, points: context.previousProfilePoints } : prev
        );
      }

      console.error("Error voting:", error);
      const toast = await getToast();

      if (error.message?.includes("User has already voted")) {
        toast.warning("이미 이 투표에 참여했습니다.");
      } else if (error.message?.includes("maximum number of voters")) {
        toast.info("정원이 마감되어 더 이상 투표할 수 없습니다.");
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
        // 프로필 점수 낙관적 반영
        const profileKey = ["current-profile", session.user.id];
        const profile =
          queryClient.getQueryData<{ points?: number }>(profileKey) ||
          queryClient.getQueryData<{ points?: number }>(["current-profile"]);
        if (profile) {
          const currentPoints = Number(profile.points ?? 0);
          queryClient.setQueryData(profileKey, {
            ...profile,
            points: currentPoints + 1,
          });
          queryClient.setQueryData(["current-profile"], {
            ...profile,
            points: currentPoints + 1,
          });
        }
      }
      // 서버 데이터 갱신을 위해 캐시 무효화 (액션 직후 반영)
      queryClient.invalidateQueries({
        queryKey: ["current-profile", session?.user?.id],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: ["current-profile"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["poll-detail", variables.pollId] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"], exact: false });
      options.onSuccess?.();
    },
  });
}
