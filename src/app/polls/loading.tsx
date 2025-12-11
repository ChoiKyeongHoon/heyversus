import { PollListSkeleton } from "@/components/common/Skeleton";

export default function Loading() {
  return (
    <div className="container mx-auto max-w-4xl p-8">
      <h2 className="text-2xl font-semibold tracking-tight mb-6 text-center">
        진행중인 투표들
      </h2>
      <PollListSkeleton count={6} />
    </div>
  );
}
