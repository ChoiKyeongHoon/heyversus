"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { EmptyState } from "@/components/common/EmptyState";
import { PollWithOptions } from "@/lib/types";

import PollClient from "./PollClient";

interface PollPageClientProps {
  pollId: string;
}

interface PollFetchError extends Error {
  status?: number;
}

export default function PollPageClient({ pollId }: PollPageClientProps) {
  const queryClient = useQueryClient();

  const {
    data,
    error,
    isLoading,
    refetch,
  } = useQuery<PollWithOptions, PollFetchError>({
    queryKey: ["poll-detail", pollId],
    queryFn: async () => {
      const response = await fetch(`/api/polls/${pollId}`);
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const err = new Error(
          payload?.error || "투표를 불러오지 못했습니다."
        ) as PollFetchError;
        err.status = response.status;
        throw err;
      }

      return payload.data as PollWithOptions;
    },
    staleTime: 30 * 1000,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl px-4 md:px-6 lg:px-8 py-12">
        <div className="flex flex-col gap-4">
          <div className="h-8 w-2/3 bg-muted animate-pulse rounded" />
          <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
          <div className="h-48 w-full bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    const isNotFound = error.status === 404;
    const isForbidden = error.status === 403;

    return (
      <div className="container mx-auto max-w-2xl px-4 py-12">
        <EmptyState
          title={
            isNotFound
              ? "투표를 찾을 수 없습니다"
              : isForbidden
              ? "접근 권한이 없습니다"
              : "오류가 발생했습니다"
          }
          message={
            isNotFound
              ? "삭제되었거나 존재하지 않는 투표입니다."
              : isForbidden
              ? "이 비공개 투표를 볼 수 있는 권한이 없습니다."
              : error.message || "잠시 후 다시 시도해주세요."
          }
          actionLabel="모든 투표 보기"
          actionHref="/polls"
        />
        <div className="mt-4 text-center">
          <button
            type="button"
            className="text-sm text-primary underline"
            onClick={() => refetch()}
          >
            다시 시도하기
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <PollClient
      poll={data}
      onRefresh={() =>
        queryClient.invalidateQueries({ queryKey: ["poll-detail", pollId] })
      }
    />
  );
}
