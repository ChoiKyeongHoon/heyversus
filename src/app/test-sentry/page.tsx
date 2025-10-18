"use client";

import * as Sentry from "@sentry/nextjs";
import { useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * Sentry 테스트 페이지
 *
 * 다양한 유형의 에러를 발생시켜 Sentry 통합이 정상적으로 작동하는지 확인합니다.
 * 프로덕션 환경에서는 이 페이지를 삭제하거나 인증으로 보호해야 합니다.
 */
export default function TestSentryPage() {
  const [errorCount, setErrorCount] = useState(0);

  // 1. 클라이언트 측 에러
  const throwClientError = () => {
    throw new Error("테스트 클라이언트 에러입니다!");
  };

  // 2. 비동기 에러 (Promise rejection)
  const throwAsyncError = async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    throw new Error("테스트 비동기 에러입니다!");
  };

  // 3. 수동으로 Sentry에 에러 전송
  const captureManualError = () => {
    Sentry.captureException(new Error("수동으로 전송된 테스트 에러입니다!"), {
      tags: {
        test_type: "manual",
      },
      extra: {
        errorCount: errorCount + 1,
        timestamp: new Date().toISOString(),
      },
    });
    setErrorCount(errorCount + 1);
  };

  // 4. 사용자 정의 메시지 전송
  const captureCustomMessage = () => {
    Sentry.captureMessage("테스트 메시지입니다!", {
      level: "info",
      tags: {
        test_type: "message",
      },
    });
  };

  // 5. Error Boundary 트리거 (throw in render)
  const [shouldThrow, setShouldThrow] = useState(false);
  if (shouldThrow) {
    throw new Error("Error Boundary 테스트 에러입니다!");
  }

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Sentry 테스트 페이지</h1>
          <p className="text-muted-foreground">
            아래 버튼들을 클릭하여 다양한 유형의 에러를 발생시키고 Sentry
            대시보드에서 확인하세요.
          </p>
          <p className="text-sm text-amber-600">
            ⚠️ 주의: 프로덕션 환경에서는 이 페이지를 삭제하거나 관리자 권한으로
            보호해야 합니다.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* 클라이언트 에러 */}
          <div className="rounded-lg border p-4 space-y-3">
            <div>
              <h3 className="font-semibold">1. 클라이언트 측 에러</h3>
              <p className="text-sm text-muted-foreground">
                동기적으로 에러를 throw하여 Sentry에 자동 전송됩니다.
              </p>
            </div>
            <Button
              onClick={throwClientError}
              variant="destructive"
              className="w-full"
            >
              클라이언트 에러 발생
            </Button>
          </div>

          {/* 비동기 에러 */}
          <div className="rounded-lg border p-4 space-y-3">
            <div>
              <h3 className="font-semibold">2. 비동기 에러</h3>
              <p className="text-sm text-muted-foreground">
                Promise rejection을 통해 비동기 에러를 발생시킵니다.
              </p>
            </div>
            <Button
              onClick={() => {
                throwAsyncError().catch(() => {
                  // Sentry가 자동으로 unhandled rejection을 캡처합니다
                });
              }}
              variant="destructive"
              className="w-full"
            >
              비동기 에러 발생
            </Button>
          </div>

          {/* 수동 에러 전송 */}
          <div className="rounded-lg border p-4 space-y-3">
            <div>
              <h3 className="font-semibold">3. 수동 에러 전송</h3>
              <p className="text-sm text-muted-foreground">
                Sentry.captureException()을 직접 호출합니다.
              </p>
            </div>
            <Button
              onClick={captureManualError}
              variant="default"
              className="w-full"
            >
              수동 에러 전송 (전송 횟수: {errorCount})
            </Button>
          </div>

          {/* 커스텀 메시지 */}
          <div className="rounded-lg border p-4 space-y-3">
            <div>
              <h3 className="font-semibold">4. 커스텀 메시지</h3>
              <p className="text-sm text-muted-foreground">
                Sentry.captureMessage()로 정보성 메시지를 전송합니다.
              </p>
            </div>
            <Button
              onClick={captureCustomMessage}
              variant="outline"
              className="w-full"
            >
              메시지 전송
            </Button>
          </div>

          {/* Error Boundary 테스트 */}
          <div className="rounded-lg border p-4 space-y-3 md:col-span-2">
            <div>
              <h3 className="font-semibold">5. Error Boundary 테스트</h3>
              <p className="text-sm text-muted-foreground">
                렌더링 중 에러를 발생시켜 Error Boundary가 에러를 잡도록
                합니다. (error.tsx 컴포넌트가 표시됩니다)
              </p>
            </div>
            <Button
              onClick={() => setShouldThrow(true)}
              variant="destructive"
              className="w-full"
            >
              Error Boundary 트리거
            </Button>
          </div>
        </div>

        {/* Sentry 대시보드 링크 */}
        <div className="rounded-lg bg-muted p-4 space-y-2">
          <h3 className="font-semibold">Sentry 대시보드 확인</h3>
          <p className="text-sm text-muted-foreground">
            에러를 발생시킨 후, Sentry 프로젝트 대시보드에서 이벤트를
            확인하세요:
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Issues 탭: 발생한 에러 목록</li>
            <li>Performance 탭: 트랜잭션 및 성능 데이터</li>
            <li>Replays 탭: 세션 리플레이 (에러 발생 시)</li>
          </ul>
        </div>

        {/* 홈으로 돌아가기 */}
        <div className="flex justify-center pt-4">
          <Button
            onClick={() => (window.location.href = "/")}
            variant="outline"
          >
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    </div>
  );
}
