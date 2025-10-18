import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 트레이싱 샘플링 레이트 설정
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // 디버그 모드
  debug: process.env.NODE_ENV === "development",

  // 환경 설정
  environment: process.env.NODE_ENV,
});
