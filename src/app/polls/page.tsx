import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";

import { getPollsPaginated } from "@/lib/services/polls";
import type { FilterStatus, SortBy, SortOrder } from "@/lib/types";

import PollsClientInfinite from "./PollsClientInfinite";

const DEFAULT_LIMIT = 20;

type PollsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function resolveParam<T extends string>(value: string | string[] | undefined, fallback: T): T {
  if (!value) return fallback;
  return Array.isArray(value) ? (value[0] as T) : (value as T);
}

export default async function PollsPage({ searchParams }: PollsPageProps) {
  const params = await searchParams;
  const sortBy = resolveParam<SortBy>(params?.sortBy as string | undefined, "created_at");
  const sortOrder = resolveParam<SortOrder>(params?.sortOrder as string | undefined, "desc");
  const filterStatus = resolveParam<FilterStatus>(params?.filterStatus as string | undefined, "all");

  const queryClient = new QueryClient();

  try {
    await queryClient.prefetchInfiniteQuery({
      queryKey: [
        "polls",
        "infinite",
        { sortBy, sortOrder, filterStatus, limit: DEFAULT_LIMIT },
      ],
      queryFn: async ({ pageParam = 0 }) => {
        const { data, error } = await getPollsPaginated(
          {
            limit: DEFAULT_LIMIT,
            offset: Number(pageParam) || 0,
            sortBy,
            sortOrder,
            filterStatus,
          }
        );

        if (error || !data) {
          throw error ?? new Error("Failed to preload polls");
        }

        return data;
      },
      initialPageParam: 0,
    });
  } catch (error) {
    console.warn("Polls prefetch skipped:", error);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <main
        className="flex flex-col"
        style={{ minHeight: "calc(100vh - 80px)" }}
      >
        <PollsClientInfinite />
      </main>
    </HydrationBoundary>
  );
}
