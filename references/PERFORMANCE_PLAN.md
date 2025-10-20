# 로딩 속도 개선 플랜

## 1. 개요
- 페이지 로딩 지연의 주된 원인은 모든 경로가 Supabase 세션 조회 때문에 SSR로 강제되고, 주요 데이터가 클라이언트에서만 패칭되며, 중복된 `router.refresh()` 호출이 많기 때문입니다.
- 아래 표는 현재 주요 페이지의 렌더링 방식과 특징을 정리한 것입니다.

| 경로 | 파일 | 렌더링 방식 | 비고 |
| --- | --- | --- | --- |
| `layout` | `src/app/layout.tsx:27-47` | SSR | 모든 요청에서 Supabase 세션/프로필을 조회해 정적 캐시 불가 |
| `/` | `src/app/page.tsx:12-41` | SSR | 대표 투표 RPC 호출, 사용자별 상태 포함 |
| `/polls` | `src/app/polls/page.tsx:1-16` | 정적 셸 + CSR | React Query가 `/api/polls`를 클라이언트에서 호출 |
| `/poll/[id]` | `src/app/poll/[id]/page.tsx:8-44` | `dynamic = "force-dynamic"` | 매 요청마다 Supabase RPC |
| `/favorites` | `src/app/favorites/page.tsx:7-50` | SSR + CSR | 즐겨찾기 리스트는 서버, 즐겨찾기 토글은 클라이언트 |
| `/account` | `src/app/account/page.tsx:7-41` | SSR | 로그인 세션 검증 + 프로필 RPC |
| `/score` | `src/app/score/page.tsx:3-75` | `dynamic = "force-dynamic"` | 포인트 랭킹 실시간 조회, 캐싱 없음 |
| `/create-poll`, `/signin`, `/signup`, `/poll` | 각 `page.tsx` | CSR | Supabase 클라이언트 SDK와 로컬 상태만 사용 |

## 2. 주요 병목 요약
1. **전역 SSR 강제**: 레이아웃에서 매 요청마다 Supabase 세션을 받아 네비게이션에 내려줌 → CDN 캐시와 ISR 이점 상실.
2. **`force-dynamic` 남용**: `/poll/[id]`, `/score`가 항상 실시간 RPC를 호출 → TTFB 증가.
3. **중복 데이터 패칭**: 여러 클라이언트 컴포넌트가 `router.refresh()`와 `supabase.auth.getSession()`을 반복하여 네트워크 요청이 폭증.
4. **CSR 의존도**: `PollsClient*`, `FeaturedPollClient`는 초기 데이터를 서버에서 전달하지 않아 JS 준비 전까지 화면이 지연.
5. **캐시 미활용**: `unstable_cache`로 감싼 서비스 함수를 실제 페이지에서 재사용하지 않아 캐싱 효과가 없음.

## 3. 실행 플랜

### 3.1 레이아웃/네비게이션 리팩터링
1. `layout.tsx`에서 세션/프로필 조회 제거 → 정적 세그먼트로 복원.
2. 네비게이션은 `Suspense`가 있는 서버 컴포넌트 또는 클라이언트 훅으로 분리, 로그인 상태만 필요할 때 API 호출.

### 3.2 데이터 캐싱 전략 재구성
1. `/poll/[id]`, `/score`에 `revalidate` 주기를 도입하고, 투표/포인트 변경 시 `revalidateTag` 활용.
2. `/` 대표 투표는 기본 데이터를 ISR로 제공하고, `has_voted` 같은 사용자 의존 정보는 클라이언트에서 병합.

### 3.3 클라이언트 패칭 최적화
1. `PollsClientInfinite` 초기 결과를 서버에서 프리패치 후 React Query `dehydrate`로 전달.
2. `router.refresh()` 호출 위치를 집약하고 불필요한 이벤트 기반 새로고침 제거.

### 3.4 번들 및 공통 로직 정리
1. 중복 투표 상태 계산 로직을 공통 훅으로 통합하여 코드와 번들 크기 축소.
2. 사용하지 않는 개발용 페이지(`test-sentry` 등)는 프로덕션 번들에서 제외.

### 3.5 인증 흐름 개선
1. `/create-poll` 같은 보호 페이지는 서버에서 바로 리다이렉트 처리하도록 전환.
2. Supabase 세션 만료 시 전체 새로고침 대신 필요한 컴포넌트만 갱신하도록 `onAuthStateChange` 처리 개선.

## 4. 추적 및 검증
- 변경 후 Lighthouse 또는 Next.js `next build --profile`과 `next analyze`를 사용해 TTFB, FCP, 번들 크기 변화를 추적합니다.
- 주요 플로우(투표 생성/참여, 즐겨찾기, 로그인)를 다시 테스트해 기능 회귀 여부를 확인합니다.
