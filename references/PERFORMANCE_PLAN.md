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

### 3.5 데이터 캐싱 전략 재구성 *(검토 중)*
- [x] `/poll/[id]`, `/score`에 `revalidate` 주기를 도입해 `/score`에는 `revalidate=120`을 적용했고 `/poll/[id]`는 CSR 전환으로 SSR 의존을 제거했습니다. *(단, `revalidateTag` 자동 갱신은 미적용)*
- [x] 투표/포인트 변경 시 `revalidateTag`로 자동 재검증을 트리거하는 파이프라인을 구축합니다. `/api/polls/[id]/vote`가 `poll-*`, `polls`, `featured-polls`, `leaderboard` 태그를 갱신하도록 통합했습니다. (Step 14.2)
- [x] `/` 대표 투표는 기본 데이터를 ISR로 제공하고 `has_voted` 등의 사용자 의존 정보는 클라이언트에서 병합하는 구조로 전환합니다. 익명 Supabase + `unstable_cache`로 정적 데이터를 공급하고, `useVoteStatus`가 클라이언트에서 사용자의 투표 상태를 병합합니다. (Step 14.3)

## 4. 추적 및 검증
- 변경 후 Lighthouse 또는 Next.js `next build --profile`과 `next analyze`를 사용해 TTFB, FCP, 번들 크기 변화를 추적합니다.
- 주요 플로우(투표 생성/참여, 즐겨찾기, 로그인)를 다시 테스트해 기능 회귀 여부를 확인합니다.

## 5. PageSpeed Insights (모바일/데스크톱 공통 메모)

**모바일 리포트**  
- 실험실 지표: `LCP 3.0초`, `FCP 0.9초`, `TBT 80ms`, `Speed Index 2.2초`. 느린 LCP는 히어로 이미지(`alt="안현민"`)가 DOM에 늦게 노출되기 때문입니다. 해당 이미지를 HTML에서 곧바로 노출하고 `loading="lazy"`를 제거하며 `fetchpriority="high"`를 지정해 로드 지연(1.25초)을 없애세요.  
- “Legacy JavaScript” 경고(총 24KiB)는 `_next/static/chunks/117-60ec0d4eaa7cc599.js`, `52774a7f-5449a2939f6e8b6e.js`에서 과도한 폴리필을 실어 보내기 때문입니다. `browserslist`나 Next.js 설정을 최신 크롬 기준으로 좁혀 ES2015+ 코드를 직접 전송하거나, 구형 브라우저만 조건부로 폴리필을 로드하도록 조정하세요.  
- “Reduce unused JavaScript”에서 145KiB가 낭비됩니다. 동일한 두 JS 청크와 `_next/static/chunks/559-9b01b5c12a237053.js`가 주범이니, 번들 분석(`next build --analyze`)으로 실제 사용하는 컴포넌트만 남기고, 사용 빈도가 낮은 UI는 `dynamic import`(SSR 비활성)로 분리해 모바일 초기 JS를 70KiB 안팎으로 줄이세요.  
- 메인 스레드에서 200ms 이상 걸리는 작업이 2개 있습니다(webpack 청크 204ms, 문서 50ms). 무거운 계산 로직을 렌더와 분리하고, React 컴포넌트 메모이제이션/서스펜스 사용 시 하이드레이션을 막지 않도록 점검하세요.  
- 전체 네트워크 페이로드가 412KiB로 다소 큽니다. Supabase 이미지 품질/크기를 조정하고 `next/image`의 `quality`나 AVIF 전환을 검토하세요. 웹폰트(`e4af272ccee01ff0-s.p.woff2`)에는 `font-display:swap`을 적용해 텍스트 표시가 지연되지 않도록 합니다.  
- 세부 권장사항: 중요한 외부 호스트(Vercel 이미지, Supabase)에 `preconnect` 추가, 푸터 텍스트 대비 향상, 렌더 차단 CSS/JS를 줄이도록 `next/script strategy="afterInteractive"`나 중요한 CSS 인라인화도 고려하세요.

**데스크톱 리포트**  
- 지표는 좋지만(`LCP 0.6초`, `FCP 0.2초`, `TBT 10ms`) 구조적 경고는 모바일과 동일합니다. 히어로 이미지 우선 로드, 폴리필/불필요 JS 축소는 데스크톱에도 그대로 적용하세요.  
- DOM 진단도 동일(총 98개 요소). 카드 내부 중첩을 줄이거나 CSS 레이어로 대체해 경고를 없앨 수 있습니다.  
- `_next/static/chunks/4bd1b696-564fac3563aee7ee.js`에서 62ms짜리 긴 작업이 발생합니다. 어떤 초기 로직이 실행되는지 확인해 지연 로드/메모이제이션을 적용하세요.  
- 접근성 경고는 주로 색 대비입니다. “VS” 배지, 푸터 텍스트가 WCAG AA 기준 미달이니 브랜드 색상을 약간 어둡게 하거나 텍스트를 밝게 조정해 모든 뷰포트에서 통일하세요.  
- `font-display` 누락, 강제 리플로우, `preconnect` 없음 등도 모바일과 동일하게 정리하면 데스크톱 경고도 해소됩니다.

**다음 행동 제안**  
1) 히어로 이미지 요청을 HTML에서 즉시 발견·우선 처리되도록 수정.  
2) `next build --analyze`로 청크별 사용량 파악 후 폴리필/불필요 JS 제거.  
3) 색상/폰트 설정을 손봐 대비·font-display 경고 제거.
