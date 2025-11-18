# 로딩 속도 개선 플랜

## 1. 개요

- 페이지 로딩 지연의 주된 원인은 모든 경로가 Supabase 세션 조회 때문에 SSR로 강제되고, 주요 데이터가 클라이언트에서만 패칭되며, 중복된 `router.refresh()` 호출이 많기 때문입니다.
- 아래 표는 현재 주요 페이지의 렌더링 방식과 특징을 정리한 것입니다.

| 경로                                          | 파일                              | 렌더링 방식                 | 비고                                                       |
| --------------------------------------------- | --------------------------------- | --------------------------- | ---------------------------------------------------------- |
| `layout`                                      | `src/app/layout.tsx:27-47`        | SSR                         | 모든 요청에서 Supabase 세션/프로필을 조회해 정적 캐시 불가 |
| `/`                                           | `src/app/page.tsx:12-41`          | SSR                         | 대표 투표 RPC 호출, 사용자별 상태 포함                     |
| `/polls`                                      | `src/app/polls/page.tsx:1-16`     | 정적 셸 + CSR               | React Query가 `/api/polls`를 클라이언트에서 호출           |
| `/poll/[id]`                                  | `src/app/poll/[id]/page.tsx:8-44` | `dynamic = "force-dynamic"` | 매 요청마다 Supabase RPC                                   |
| `/favorites`                                  | `src/app/favorites/page.tsx:7-50` | SSR + CSR                   | 즐겨찾기 리스트는 서버, 즐겨찾기 토글은 클라이언트         |
| `/account`                                    | `src/app/account/page.tsx:7-41`   | SSR                         | 로그인 세션 검증 + 프로필 RPC                              |
| `/score`                                      | `src/app/score/page.tsx:3-75`     | `dynamic = "force-dynamic"` | 포인트 랭킹 실시간 조회, 캐싱 없음                         |
| `/create-poll`, `/signin`, `/signup`, `/poll` | 각 `page.tsx`                     | CSR                         | Supabase 클라이언트 SDK와 로컬 상태만 사용                 |

## 2. 주요 병목 요약

1. **전역 SSR 강제**: 레이아웃에서 매 요청마다 Supabase 세션을 받아 네비게이션에 내려줌 → CDN 캐시와 ISR 이점 상실.
2. **`force-dynamic` 남용**: `/poll/[id]`, `/score`가 항상 실시간 RPC를 호출 → TTFB 증가.
3. **중복 데이터 패칭**: 여러 클라이언트 컴포넌트가 `router.refresh()`와 `supabase.auth.getSession()`을 반복하여 네트워크 요청이 폭증.
4. **CSR 의존도**: `PollsClient*`, `FeaturedPollClient`는 초기 데이터를 서버에서 전달하지 않아 JS 준비 전까지 화면이 지연.
5. **캐시 미활용**: `unstable_cache`로 감싼 서비스 함수를 실제 페이지에서 재사용하지 않아 캐싱 효과가 없음.

## 3. 실행 플랜

> 2025 Q1 업데이트: Step 14 1차 적용으로 **3.1 전체**와 **3.3-2** 항목을 완료했습니다. 나머지 항목은 이후 단계에서 계속 추적합니다.

### 3.1 레이아웃/네비게이션 리팩터링

- [x] `layout.tsx`에서 세션/프로필 조회 제거 → 정적 세그먼트로 복원. (`v0.6.1`, Step 14)
- [x] 네비게이션은 클라이언트 훅(`useSession`, `useCurrentProfile`)으로 전환해 로그인 상태에 따라 필요한 데이터만 가져옴.

### 3.2 클라이언트 패칭 최적화

- [x] `PollsClientInfinite` 초기 결과를 서버에서 프리패치 후 React Query `dehydrate`로 전달.
- [x] `router.refresh()` 호출 위치를 집약하고, 투표/즐겨찾기는 React Query 캐시 갱신 + `invalidateQueries`로 대체.

### 3.3 번들 및 공통 로직 정리

- [x] 중복 투표 상태 계산 로직을 `useVoteStatus` 훅으로 통합하여 Polls/Featured 컴포넌트의 localStorage·세션 처리 중복을 제거했습니다.
- [x] 사용하지 않는 개발용 페이지(`/test-sentry`)를 프로덕션 번들에서 제거하고, 필요 시 로컬 디버깅 용도로만 유지합니다.

### 3.4 인증 흐름 개선

- [x] `/create-poll`과 같은 보호 페이지는 서버 컴포넌트에서 세션을 검사해 비로그인 사용자를 즉시 `/signin?redirect=/create-poll`로 리다이렉트합니다.
- [x] Supabase `onAuthStateChange` 이벤트를 활용해 세션 만료 시 클라이언트에서 필요한 컴포넌트만 갱신(또는 리다이렉션)하도록 처리했습니다.

### 3.5 데이터 캐싱 전략 재구성

- [x] `/poll/[id]`, `/score`에 `revalidate` 주기를 도입해 `/score`에는 `revalidate=120`을 적용했고 `/poll/[id]`는 CSR 전환으로 SSR 의존을 제거했습니다. _(단, `revalidateTag` 자동 갱신은 미적용)_
- [x] 투표/포인트 변경 시 `revalidateTag`로 자동 재검증을 트리거하는 파이프라인을 구축합니다. `/api/polls/[id]/vote`가 `poll-*`, `polls`, `featured-polls`, `leaderboard` 태그를 갱신하도록 통합했습니다. (Step 14.2)
- [x] `/` 대표 투표는 기본 데이터를 ISR로 제공하고 `has_voted` 등의 사용자 의존 정보는 클라이언트에서 병합하는 구조로 전환합니다. 익명 Supabase + `unstable_cache`로 정적 데이터를 공급하고, `useVoteStatus`가 클라이언트에서 사용자의 투표 상태를 병합합니다. (Step 14.3)

## 4. 히어로 & Above-the-Fold 최적화

- [x] 랜딩 히어로 이미지(`alt="안현민"`)를 서버에서 바로 렌더하고 `next/image`의 `priority`/`fetchPriority="high"`를 지정해 LCP 지연을 제거합니다. `LandingHero` 컴포넌트가 첫 번째 대표 투표 이미지를 우선 로드하며 `sizes="100vw"`/LQIP를 적용합니다.
- [x] 히어로 배경/CTA 영역에 필요 이상의 클라이언트 로직이 없도록 정리하고, 텍스트·버튼을 SSR HTML로 먼저 출력합니다. Landing page는 순수 서버 컴포넌트 기반 히어로로 전환해 초기 페인트를 가볍게 유지합니다.
- [x] PollsHero와 Featured Poll 카드 위쪽에 가벼운 skeleton 또는 저해상도 이미지 프리뷰(LQIP)를 넣어 사용자가 1초 이내에 시각적 피드백을 받도록 합니다. Featured 카드 이미지에 blur placeholder와 로딩 skeleton을 추가했습니다.

## 6. 번들 및 스크립트 경량화

- [ ] `next build --analyze`로 `_next/static/chunks/117-60ec0d4eaa7cc599.js`, `52774a7f-5449a2939f6e8b6e.js`, `559-9b01b5c12a237053.js`가 어떤 컴포넌트에서 생성되는지 파악하고 145KiB의 사용하지 않는 JS를 제거합니다. _(진행중: Sentry 관련 117/52774a7f 청크는 제거 완료, @supabase/ssr가 포함된 559 청크는 남아 있음)_
- [x] 롤업된 117/52774a7f Sentry 청크를 제거하여 초기 공용 번들을 축소합니다.
- [x] `browserslist`와 Next.js `target`을 최신 크롬/사파리 중심으로 좁혀 불필요한 Legacy 폴리필을 빌드에서 제외합니다.
- [ ] 사용 빈도가 낮은 UI(예: Score 보드, 통계 위젯, 실험적 컴포넌트 등)는 `next/dynamic` + `ssr: false`로 분리하여 모바일 초기 JS를 70KiB 이하로 낮춥니다.
- [ ] 메인 스레드에서 200ms 이상 걸리는 청크(webpack chunk 204ms, `_next/static/chunks/4bd1b696-564fac3563aee7ee.js` 62ms)를 프로파일링하여 계산 로직을 메모이제이션하거나 Web Worker/지연 로드로 이동합니다.

## 5. 네트워크·스타일·접근성 보강

- [ ] Supabase/외부 이미지에 대해 `next/image`의 `quality`·`formats`(AVIF/WebP) 옵션을 조정하고, 필요 시 썸네일 버전을 만들어 네트워크 페이로드를 412KiB 이하로 유지합니다.
- [ ] `https://images.vercel.com`, Supabase Storage 등 주요 외부 호스트에 `<link rel="preconnect">`/`dns-prefetch`를 추가해 첫 네트워크 왕복을 줄입니다.
- [ ] 웹폰트(`e4af272ccee01ff0-s.p.woff2`)에 `font-display: swap`을 적용하고, 렌더 차단 스크립트는 `next/script strategy="afterInteractive"`로 미룹니다. 핵심 CSS는 가능한 한 인라인화합니다.
- [ ] “VS” 배지와 푸터 텍스트의 색 대비를 WCAG AA 기준으로 조정하고, DOM 중첩을 줄여 총 요소 수(98개) 경고를 완화합니다.

## 7. 추적 및 검증

- 변경 후 Lighthouse 또는 Next.js `next build --profile`과 `next analyze`를 사용해 TTFB, FCP, 번들 크기 변화를 추적합니다.
- 주요 플로우(투표 생성/참여, 즐겨찾기, 로그인)를 다시 테스트해 기능 회귀 여부를 확인합니다.
