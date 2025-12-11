import { useEffect } from "react";

/**
 * 페이지 가시성 변경을 감지하고 콜백을 실행하는 커스텀 훅
 *
 * @param {() => void} onVisible - 페이지가 보이게 될 때 실행할 콜백
 *
 * @example
 * ```tsx
 * function PollList() {
 *   const router = useRouter();
 *
 *   // 다른 탭에서 돌아왔을 때 자동으로 데이터 새로고침
 *   useVisibilityChange(() => {
 *     router.refresh();
 *   });
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export function useVisibilityChange(onVisible: () => void) {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        onVisible();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [onVisible]);
}
