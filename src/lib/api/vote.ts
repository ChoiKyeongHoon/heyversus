interface VoteApiResponse {
  message?: string;
  error?: string;
}

export interface SubmitVoteParams {
  pollId: string;
  optionId: string;
}

export interface VoteError extends Error {
  status?: number;
}

export async function submitVoteRequest({
  pollId,
  optionId,
}: SubmitVoteParams): Promise<VoteApiResponse> {
  const response = await fetch(`/api/polls/${pollId}/vote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ optionId }),
  });

  let payload: VoteApiResponse = {};

  try {
    payload = (await response.json()) as VoteApiResponse;
  } catch (error) {
    console.warn("Failed to parse vote response", error);
  }

  if (!response.ok) {
    const voteError = new Error(
      payload?.error || "투표 중 오류가 발생했습니다."
    ) as VoteError;
    voteError.status = response.status;
    throw voteError;
  }

  return payload;
}
