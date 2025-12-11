import { PollCardSkeleton } from "@/components/common/Skeleton";

export default function Loading() {
  return (
    <div className="container mx-auto max-w-4xl p-8">
      <div className="mb-12 text-center">
        <div className="h-10 w-3/4 mx-auto bg-gray-200 dark:bg-gray-700 animate-pulse rounded-md mb-2" />
        <div className="h-6 w-1/2 mx-auto bg-gray-200 dark:bg-gray-700 animate-pulse rounded-md" />
      </div>
      <PollCardSkeleton />
    </div>
  );
}
