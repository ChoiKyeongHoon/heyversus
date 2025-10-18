/**
 * Next.js Instrumentation Hook
 *
 * Next.js 15에서 Sentry와 같은 observability 도구를 통합하기 위한 hook입니다.
 * 이 파일은 서버 시작 시 한 번만 실행됩니다.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

const hasSentryConfig = () =>
  Boolean(process.env.SENTRY_DSN) || Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);

export async function register() {
  if (!hasSentryConfig()) {
    return;
  }

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = async (
  err: Error,
  request: {
    path: string;
    method: string;
    headers: { [key: string]: string | string[] | undefined };
  }
) => {
  if (!hasSentryConfig()) {
    return;
  }

  // Sentry에 에러 자동 전송
  await import("@sentry/nextjs").then((Sentry) => {
    if (!Sentry.getCurrentHub().getClient()) {
      return;
    }

    Sentry.captureException(err, {
      contexts: {
        request: {
          method: request.method,
          url: request.path,
          headers: request.headers,
        },
      },
    });
  });
};
