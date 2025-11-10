"use client";

import { Button } from "@/components/ui/button";

export type PollCategoryKey = "latest" | "popular" | "closing";

interface PollCategoryTabsProps {
  active: PollCategoryKey;
  onChange: (_category: PollCategoryKey) => void;
}

const CATEGORY_LABELS: Record<PollCategoryKey, string> = {
  latest: "최신",
  popular: "인기",
  closing: "마감 임박",
};

export function PollCategoryTabs({ active, onChange }: PollCategoryTabsProps) {
  return (
    <div className="inline-flex items-center rounded-full border border-border bg-background-subtle p-1 text-sm">
      {(Object.keys(CATEGORY_LABELS) as PollCategoryKey[]).map((key) => {
        const isActive = key === active;
        return (
          <Button
            key={key}
            type="button"
            size="sm"
            variant="ghost"
            className={`rounded-full px-4 py-1 text-xs font-semibold transition-all sm:text-sm ${
              isActive
                ? "bg-primary text-white shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
            onClick={() => onChange(key)}
          >
            {CATEGORY_LABELS[key]}
          </Button>
        );
      })}
    </div>
  );
}
