/**
 * Instrumentation hook (no-op)
 *
 * Sentry를 제거하여 번들 크기를 줄였기 때문에 현재는 빈 훅으로 둡니다.
 * 추후 다른 관측 도구를 붙일 때 이 파일을 재사용할 수 있습니다.
 */

export async function register() {
  return;
}

export const onRequestError = async () => {
  return;
};
