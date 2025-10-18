"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/**
 * Error Boundary Component
 *
 * Next.js App Router의 페이지 레벨 에러 처리 컴포넌트입니다.
 * 에러 발생 시 Sentry에 자동으로 리포트하고 사용자에게 친화적인 UI를 표시합니다.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/error
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Sentry에 에러 리포트
    if (Sentry.getCurrentHub().getClient()) {
      Sentry.captureException(error);
    }
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">
            문제가 발생했습니다
          </h1>
          <p className="text-muted-foreground">
            예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
          </p>
        </div>

        {process.env.NODE_ENV === "development" && (
          <div className="rounded-lg bg-destructive/10 p-4 text-left">
            <p className="font-mono text-sm text-destructive break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="font-mono text-xs text-muted-foreground mt-2">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}

        <div className="flex gap-4 justify-center">
          <Button onClick={() => reset()} variant="default">
            다시 시도
          </Button>
          <Button onClick={() => (window.location.href = "/")} variant="outline">
            홈으로 이동
          </Button>
        </div>
      </div>
    </div>
  );
}
