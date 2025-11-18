"use client";

import { useEffect } from "react";

/**
 * Global Error Boundary Component
 *
 * Next.js App Router의 전역 에러 처리 컴포넌트입니다.
 * 루트 레이아웃(layout.tsx)에서 발생한 에러까지 포함하여 모든 에러를 처리합니다.
 *
 * IMPORTANT: global-error.tsx는 자체 <html>, <body> 태그를 정의해야 합니다.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/error#global-errortsx
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error boundary hit:", error);
  }, [error]);

  return (
    <html>
      <body>
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div
            style={{
              maxWidth: "28rem",
              width: "100%",
              textAlign: "center",
            }}
          >
            <h1
              style={{
                fontSize: "2.25rem",
                fontWeight: "bold",
                marginBottom: "1rem",
              }}
            >
              문제가 발생했습니다
            </h1>
            <p
              style={{
                color: "#666",
                marginBottom: "2rem",
              }}
            >
              예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
            </p>

            {process.env.NODE_ENV === "development" && error.message && (
              <div
                style={{
                  background: "#fee",
                  padding: "1rem",
                  borderRadius: "0.5rem",
                  marginBottom: "2rem",
                  textAlign: "left",
                }}
              >
                <p
                  style={{
                    fontFamily: "monospace",
                    fontSize: "0.875rem",
                    color: "#c00",
                    wordBreak: "break-all",
                  }}
                >
                  {error.message}
                </p>
                {error.digest && (
                  <p
                    style={{
                      fontFamily: "monospace",
                      fontSize: "0.75rem",
                      color: "#999",
                      marginTop: "0.5rem",
                    }}
                  >
                    Error ID: {error.digest}
                  </p>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
              <button
                onClick={() => reset()}
                style={{
                  padding: "0.5rem 1rem",
                  background: "#0070f3",
                  color: "white",
                  border: "none",
                  borderRadius: "0.375rem",
                  cursor: "pointer",
                  fontSize: "1rem",
                }}
              >
                다시 시도
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                style={{
                  padding: "0.5rem 1rem",
                  background: "white",
                  color: "#333",
                  border: "1px solid #ddd",
                  borderRadius: "0.375rem",
                  cursor: "pointer",
                  fontSize: "1rem",
                }}
              >
                홈으로 이동
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
