import { useInfiniteQuery } from "@tanstack/react-query";

import type { FilterStatus, PollsResponse, SortBy, SortOrder } from "@/lib/types";

interface UseInfinitePollsParams {
  sortBy?: SortBy;
  sortOrder?: SortOrder;
  filterStatus?: FilterStatus;
  limit?: number;
}

/**
 * React Query hook for infinite scroll pagination of polls
 *
 * @param params - Filtering and sorting parameters
 * @returns useInfiniteQuery result with polls data and pagination state
 *
 * @example
 * ```tsx
 * const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfinitePolls({
 *   sortBy: 'created_at',
 *   sortOrder: 'desc',
 *   filterStatus: 'all',
 * });
 * ```
 */
export function useInfinitePolls(params: UseInfinitePollsParams = {}) {
  const {
    sortBy = 'created_at',
    sortOrder = 'desc',
    filterStatus = 'all',
    limit = 20,
  } = params;

  return useInfiniteQuery({
    queryKey: ['polls', 'infinite', { sortBy, sortOrder, filterStatus, limit }],
    queryFn: async ({ pageParam = 0 }) => {
      const searchParams = new URLSearchParams({
        limit: limit.toString(),
        offset: pageParam.toString(),
        sortBy,
        sortOrder,
        filterStatus,
      });

      const response = await fetch(`/api/polls?${searchParams.toString()}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch polls');
      }

      const data: PollsResponse = await response.json();
      return data;
    },
    getNextPageParam: (lastPage) => {
      // Return the next offset if there are more pages, otherwise undefined
      return lastPage.pagination.hasNextPage
        ? lastPage.pagination.nextOffset
        : undefined;
    },
    initialPageParam: 0,
    // Keep previous data while fetching new data (smoother UX)
    placeholderData: (previousData) => previousData,
    // Stale time: 30 seconds (balance between freshness and performance)
    staleTime: 30 * 1000,
  });
}
