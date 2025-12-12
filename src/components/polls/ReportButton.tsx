"use client";

import { Flag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useSession } from "@/hooks/useSession";
import { getToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const REASON_OPTIONS = [
  { value: "spam", label: "스팸/광고" },
  { value: "hate", label: "혐오/차별" },
  { value: "sexual", label: "성적 콘텐츠" },
  { value: "violence", label: "폭력/위험" },
  { value: "harassment", label: "괴롭힘" },
  { value: "misinfo", label: "허위 정보" },
  { value: "other", label: "기타" },
] as const;

type ReasonCode = (typeof REASON_OPTIONS)[number]["value"];

type ReportButtonProps = {
  pollId: string;
  redirectPath?: string;
  className?: string;
};

export function ReportButton({
  pollId,
  redirectPath = `/poll/${pollId}`,
  className,
}: ReportButtonProps) {
  const { session } = useSession();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [reasonCode, setReasonCode] = useState<ReasonCode>("spam");
  const [reasonDetail, setReasonDetail] = useState("");
  const [pending, setPending] = useState(false);

  const close = () => {
    if (pending) return;
    setIsOpen(false);
  };

  const submit = async () => {
    if (pending) return;
    setPending(true);

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "poll",
          pollId,
          reasonCode,
          reasonDetail: reasonDetail.trim() ? reasonDetail.trim() : undefined,
        }),
      });

      const payload = (await response.json()) as {
        data?: string;
        error?: string;
      };

      if (!response.ok) {
        const toast = await getToast();
        toast.error(payload.error || "신고에 실패했습니다.");
        return;
      }

      const toast = await getToast();
      toast.success("신고가 접수되었습니다. 감사합니다.");
      setIsOpen(false);
      setReasonDetail("");
      setReasonCode("spam");
    } catch (error) {
      console.error("Failed to submit report:", error);
      const toast = await getToast();
      toast.error("신고 요청 중 오류가 발생했습니다.");
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (pending) return;
          if (!session) {
            router.push(`/signin?redirect=${encodeURIComponent(redirectPath)}`);
            return;
          }
          setIsOpen(true);
        }}
        disabled={pending}
        aria-label="신고하기"
        title={!session ? "로그인이 필요한 기능입니다." : "신고하기"}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full border border-border text-text-tertiary transition hover:border-primary/40 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/50",
          pending && "opacity-60 cursor-not-allowed",
          className
        )}
      >
        <Flag className="h-4 w-4" />
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-panel shadow-2xl">
            <button
              type="button"
              aria-label="닫기"
              onClick={close}
              className="absolute right-3 top-3 text-text-secondary hover:text-text-primary"
            >
              ×
            </button>
            <div className="p-5 md:p-6 space-y-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-text-primary">
                  신고하기
                </h2>
                <p className="text-sm text-text-secondary">
                  신고 사유를 선택하고, 필요하면 상세 내용을 남겨주세요.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-text-tertiary">
                  사유
                </label>
                <select
                  value={reasonCode}
                  onChange={(e) => setReasonCode(e.target.value as ReasonCode)}
                  disabled={pending}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/50"
                >
                  {REASON_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-text-tertiary">
                  상세(선택)
                </label>
                <textarea
                  value={reasonDetail}
                  onChange={(e) => setReasonDetail(e.target.value)}
                  disabled={pending}
                  rows={4}
                  placeholder="예) 광고 링크 포함, 혐오 표현 포함 등"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/50"
                />
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={close}
                  disabled={pending}
                  className="h-10 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-text-primary transition hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={pending}
                  className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-border"
                >
                  {pending ? "전송 중..." : "신고 접수"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

