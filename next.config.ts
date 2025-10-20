import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "nsdezyvsxkyjnfnqprhe.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // 개발 중 PackFileCacheStrategy 경고를 막기 위해 Webpack 파일시스템 캐시를 끕니다.
      config.cache = false;
    }
    return config;
  },
};

// Sentry 설정 래퍼
export default withSentryConfig(nextConfig, {
  // Sentry 빌드 옵션
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  sourcemaps: {
    disable: true,
  },

  // 빌드 출력 제어
  silent: !process.env.CI,

  // Source maps 업로드 설정
  widenClientFileUpload: true,

  // 라우트 자동 계측
  tunnelRoute: "/monitoring",

  // 프로덕션에서 소스맵 숨기기
  hideSourceMaps: true,

  // Vercel 모니터링 자동 설정
  automaticVercelMonitors: true,
});
