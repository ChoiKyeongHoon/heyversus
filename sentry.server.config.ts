import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
const isDevelopment = process.env.NODE_ENV === "development";

if (!SENTRY_DSN) {
  if (isDevelopment) {
    console.info("[Sentry] SENTRY_DSN이 설정되지 않아 서버 Sentry 초기화를 건너뜁니다.");
  }
} else {
  Sentry.init({
    dsn: SENTRY_DSN,

    // 트레이싱 샘플링 레이트 설정
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // 디버그 모드
    debug: isDevelopment,

    // 환경 설정
    environment: process.env.NODE_ENV,

    // 서버 사이드에서 민감한 정보 필터링
    beforeSend(event) {
      // 환경 변수에서 민감한 정보 제거
      if (event.request?.headers) {
        delete event.request.headers["authorization"];
        delete event.request.headers["cookie"];
      }

      return event;
    },
  });
}
