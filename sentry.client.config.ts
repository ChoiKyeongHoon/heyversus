import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 트레이싱 샘플링 레이트 설정 (0.0 ~ 1.0)
  // 프로덕션에서는 낮은 값 사용 권장
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // 세션 리플레이 샘플링
  replaysOnErrorSampleRate: 1.0, // 에러 발생 시 100% 리플레이 기록
  replaysSessionSampleRate: 0.1, // 일반 세션의 10%만 리플레이 기록

  // 디버그 모드 (개발 환경에서만 활성화)
  debug: process.env.NODE_ENV === "development",

  // 환경 설정
  environment: process.env.NODE_ENV,

  // 사용자 컨텍스트 자동 수집
  integrations: [
    Sentry.replayIntegration({
      // 리플레이에서 민감한 정보 마스킹
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // 특정 에러 무시 (선택적)
  ignoreErrors: [
    // 브라우저 확장 프로그램 관련 에러
    "ResizeObserver loop limit exceeded",
    "Non-Error promise rejection captured",
  ],
});
