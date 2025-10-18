import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useSupabase } from "./useSupabase";

interface VoteParams {
  pollId: string;
  optionId: string;
}

export function usePollVote() {
  const supabase = useSupabase();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({ pollId, optionId }: VoteParams) => {
      const { data, error } = await supabase.rpc("increment_vote", {
        option_id_to_update: optionId,
        poll_id_for_vote: pollId,
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onMutate: async ({ pollId }) => {
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

      // Optimistic update를 위한 이전 데이터 저장
      // Note: React Query는 서버 컴포넌트에서 가져온 데이터를 캐싱하지 않으므로
      // 여기서는 단순히 UI 상태만 낙관적으로 업데이트합니다.
      return { previousData: null };
    },
    onError: (error: Error) => {
      console.error("Error voting:", error);

      if (error.message?.includes("User has already voted")) {
        toast.warning("이미 이 투표에 참여했습니다.");
      } else if (error.message?.includes("Authentication required")) {
        toast.error("이 투표는 로그인이 필요합니다.");
      } else {
        toast.error("투표 중 오류가 발생했습니다.");
      }
    },
    onSuccess: () => {
      toast.success("투표가 완료되었습니다!");
      // 서버 컴포넌트를 새로고침하여 최신 데이터 가져오기
      router.refresh();
    },
  });
}
