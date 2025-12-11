import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const baseConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [70],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "nsdezyvsxkyjnfnqprhe.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "nsdezyvsxkyjnfnqprhe.supabase.co",
        port: "",
        pathname: "/storage/v1/object/sign/**",
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

export default withBundleAnalyzer(baseConfig);
