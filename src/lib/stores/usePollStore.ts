import { create } from "zustand";

interface PollStore {
  // 투표한 옵션 ID들을 poll_id별로 저장
  votedOptions: Record<string, string>;
  // 투표 추가
  addVote: (pollId: string, optionId: string) => void;
  // 투표 확인
  hasVoted: (pollId: string) => boolean;
  // 투표한 옵션 ID 가져오기
  getVotedOptionId: (pollId: string) => string | null;
  // 초기화
  reset: () => void;
}

export const usePollStore = create<PollStore>((set, get) => ({
  votedOptions: {},

  addVote: (pollId, optionId) =>
    set((state) => ({
      votedOptions: { ...state.votedOptions, [pollId]: optionId },
    })),

  hasVoted: (pollId) => {
    return pollId in get().votedOptions;
  },

  getVotedOptionId: (pollId) => {
    return get().votedOptions[pollId] || null;
  },

  reset: () => set({ votedOptions: {} }),
}));
