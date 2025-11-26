"use client";

import { Star } from "lucide-react";
import { useRouter } from "next/navigation";

import { useSession } from "@/hooks/useSession";
import { cn } from "@/lib/utils";

type FavoriteToggleProps = {
  isFavorited: boolean;
  pending?: boolean;
  onToggle?: () => void;
  redirectPath?: string;
  className?: string;
  size?: "sm" | "md";
};

const SIZE_MAP = {
  sm: { button: "h-7 w-7", icon: "h-3.5 w-3.5" },
  md: { button: "h-8 w-8", icon: "h-4 w-4" },
};

export function FavoriteToggle({
  isFavorited,
  pending = false,
  onToggle,
  redirectPath = "/polls",
  className,
  size = "sm",
}: FavoriteToggleProps) {
  const { session } = useSession();
  const router = useRouter();
  const sizes = SIZE_MAP[size];

  return (
    <button
      type="button"
      onClick={() => {
        if (pending) return;
        if (!session) {
          router.push(`/signin?redirect=${encodeURIComponent(redirectPath)}`);
          return;
        }
        onToggle?.();
      }}
      disabled={pending}
      aria-pressed={isFavorited}
      title={
        !session
          ? "로그인이 필요한 기능입니다."
          : isFavorited
            ? "즐겨찾기 해제"
            : "즐겨찾기 추가"
      }
      className={cn(
        "flex items-center justify-center rounded-full border transition",
        sizes.button,
        isFavorited
          ? "border-yellow-400 text-yellow-400"
          : "border-border text-text-secondary hover:text-text-primary",
        pending && "opacity-60 cursor-not-allowed",
        className
      )}
    >
      <Star className={sizes.icon} fill={isFavorited ? "currentColor" : "none"} />
    </button>
  );
}
