"use client";

import type { FilterStatus, SortBy, SortOrder } from "@/lib/types";

interface PollsFilterBarProps {
  sortBy: SortBy;
  sortOrder: SortOrder;
  filterStatus: FilterStatus;
  onSortByChange: (_value: SortBy) => void;
  onSortOrderChange: (_value: SortOrder) => void;
  onFilterStatusChange: (_value: FilterStatus) => void;
  onSortChange?: (_value: { sortBy: SortBy; sortOrder: SortOrder }) => void;
  totalCount?: number;
}

// Props are intentionally not destructured to avoid unused var warnings
// They are used in the JSX below

/**
 * Filter and sort controls for polls list
 */
export function PollsFilterBar({
  sortBy,
  sortOrder,
  filterStatus,
  onSortByChange,
  onSortOrderChange,
  onFilterStatusChange,
  onSortChange,
  totalCount,
}: PollsFilterBarProps) {
  // Combine sortBy and sortOrder into a single select for better mobile UX
  const sortValue = `${sortBy}-${sortOrder}`;

  const handleSortChange = (value: string) => {
    const [newSortBy, newSortOrder] = value.split('-') as [SortBy, SortOrder];
    if (onSortChange) {
      onSortChange({ sortBy: newSortBy, sortOrder: newSortOrder });
    } else {
      onSortByChange(newSortBy);
      onSortOrderChange(newSortOrder);
    }
  };

  return (
    <div className="bg-panel border border-border rounded-lg p-3 md:p-4 mb-4 md:mb-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4">
        {/* Status Filter */}
        <div className="flex-1 min-w-0">
          <label
            htmlFor="filter-status"
            className="block text-xs font-medium text-text-secondary mb-1.5"
          >
            상태
          </label>
          <select
            id="filter-status"
            value={filterStatus}
            onChange={(e) => onFilterStatusChange(e.target.value as FilterStatus)}
            className="w-full bg-background-light border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
          >
            <option value="all">전체</option>
            <option value="active">진행 중</option>
            <option value="closed">마감</option>
          </select>
        </div>

        {/* Sort Dropdown */}
        <div className="flex-1 min-w-0">
          <label
            htmlFor="sort-by"
            className="block text-xs font-medium text-text-secondary mb-1.5"
          >
            정렬
          </label>
          <select
            id="sort-by"
            value={sortValue}
            onChange={(e) => handleSortChange(e.target.value)}
            className="w-full bg-background-light border border-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
          >
            <option value="created_at-desc">최신순</option>
            <option value="created_at-asc">오래된순</option>
            <option value="votes-desc">투표 많은순</option>
            <option value="votes-asc">투표 적은순</option>
            <option value="expires_at-asc">마감 임박순</option>
            <option value="expires_at-desc">마감 여유순</option>
          </select>
        </div>

        {/* Total Count (Desktop only) */}
        {totalCount !== undefined && (
          <div className="hidden sm:flex items-end pb-2">
            <span className="text-sm text-text-tertiary whitespace-nowrap">
              총 {totalCount.toLocaleString()}개
            </span>
          </div>
        )}
      </div>

      {/* Total Count (Mobile only) */}
      {totalCount !== undefined && (
        <div className="sm:hidden mt-2 pt-2 border-t border-border-subtle">
          <span className="text-xs text-text-tertiary">
            총 {totalCount.toLocaleString()}개의 투표
          </span>
        </div>
      )}
    </div>
  );
}
