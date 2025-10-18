"use client";

import { useEffect, useRef } from "react";

interface LoadMoreTriggerProps {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
}

/**
 * Infinite scroll trigger component using IntersectionObserver
 *
 * Automatically loads more content when the trigger element is visible
 */
export function LoadMoreTrigger({
  onLoadMore,
  hasMore,
  isLoading,
}: LoadMoreTriggerProps) {
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting) {
          onLoadMore();
        }
      },
      {
        // Trigger when element is 200px from entering viewport
        rootMargin: '200px',
        threshold: 0,
      }
    );

    observer.observe(trigger);

    return () => {
      if (trigger) {
        observer.unobserve(trigger);
      }
    };
  }, [onLoadMore, hasMore, isLoading]);

  if (!hasMore) {
    return (
      <div className="text-center py-6 md:py-8">
        <p className="text-sm md:text-base text-text-tertiary">
          모든 투표를 확인했습니다.
        </p>
      </div>
    );
  }

  return (
    <div ref={triggerRef} className="py-6 md:py-8">
      {isLoading ? (
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm md:text-base text-text-secondary">
            로딩 중...
          </p>
        </div>
      ) : (
        <div className="flex justify-center">
          <button
            onClick={onLoadMore}
            className="bg-transparent border border-border hover:bg-panel-hover text-text-secondary font-semibold py-2.5 px-6 rounded-md transition-colors duration-200 text-sm md:text-base min-h-[44px]"
          >
            더 보기
          </button>
        </div>
      )}
    </div>
  );
}
