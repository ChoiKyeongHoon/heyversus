import { useMutation } from "@tanstack/react-query";

import { useSupabase } from "@/hooks/useSupabase";

interface ToggleFavoriteParams {
  pollId: string;
}

interface ToggleFavoriteResult {
  pollId: string;
  isFavorited: boolean;
}

export function useToggleFavorite() {
  const supabase = useSupabase();

  return useMutation<ToggleFavoriteResult, unknown, ToggleFavoriteParams>({
    mutationFn: async ({ pollId }) => {
      const { data, error } = await supabase.rpc("toggle_favorite", {
        p_poll_id: pollId,
      });

      if (error) {
        throw error;
      }

      const result = Array.isArray(data) && data.length > 0 ? data[0] : null;
      const isFavorited =
        result && typeof result.is_favorited === "boolean"
          ? result.is_favorited
          : false;

      // 즐겨찾기 추가 시 점수 이벤트 적재 (삭제 시에는 기록 안 함)
      if (isFavorited) {
        // 즐겨찾기는 포인트를 부여하지 않습니다.
      }

      return { pollId, isFavorited };
    },
  });
}
