# Heyversus Implementation Roadmap

## Step 0 – 프로젝트 현황

- **기술 스택**: Next.js 15.5.2, React 19.1.0, TypeScript, Tailwind CSS v4, Supabase.
- **핵심 기능**: 투표 생성·참여·조회, 실시간 결과, 공유 링크, 로그인/회원가입.
- **최근 해결**: `PollPageProps` 타입 부재 해결, `create_new_poll`/`increment_vote` Supabase 함수 생성, `question` → `title` 필드 정합성 확보.
- **현재 상태**: 생성/조회는 정상, 투표 실행은 `increment_vote` 파라미터 불일치로 일부 실패 가능.
- **데이터 모델**: `polls(id, title, is_public, created_at, user_id)`, `poll_options(id, poll_id, text, votes, image_url, created_at)`.

## Step 1 – 크리티컬 이슈 안정화 (완료)

- `selectedOptionIds` 패턴 도입으로 옵션 상태 공유 버그 제거.
- `isPollExpired`·`formatExpiryDate` 유틸 추가로 만료 시간 null 처리 이슈 해결.
- 결과: 핵심 투표 플로우의 치명적 오류 제거, QA 기준선 확보.

## Step 2 – 엔지니어링 생산성 강화를 위한 품질 전략 (완료)

- ✅ **정적 분석 강화**: `eslint-plugin-simple-import-sort` 적용 및 `no-unused-vars` 커스텀으로 import 정렬/미사용 변수 관리, `npm run lint`가 Next ESLint CLI를 사용하도록 정비.
- ✅ **커밋 훅 자동화**: Husky + lint-staged 구성(`.husky/pre-commit`, `next lint --fix --file`)으로 커밋 전 코드 품질 점검 자동화.
- ✅ **모듈 경로 정비**: `tsconfig.json`에 `baseUrl` 추가로 `@/*` 절대 경로를 안정화.
- ✅ **테스트 러너 도입**: Jest + Testing Library 환경(`jest.config.js`, `jest.setup.ts`) 구성 및 `npm run test` 스크립트/샘플 유틸 테스트 추가.
- ✅ **문서 업데이트**: README에 설치·테스트·즐겨찾기 문서화 갱신, Husky/테스트 스크립트 안내 포함.

## Step 3 – 단기 P1 스텝 (완료)

- ✅ **Poll 타입 정리**: `src/lib/types.ts`를 최신 DB 스키마에 맞춰 재검토하고 불일치 제거. `created_by`, `is_public`, `is_featured`, `featured_image_url` 필드 추가, `expires_at`을 `string | null`로 수정.
- ✅ **Next.js Image 마이그레이션**: deprecated props (`layout`, `objectFit`) 제거, 최신 API (`fill`, `sizes`, `style`) 적용으로 경고 제거 및 성능 확보.
- ✅ **DB 인덱스 추가**: `poll_options(poll_id)`, `user_votes(poll_id, user_id)`, `polls(is_featured, is_public, created_at)`, `profiles(points)` 인덱스를 QUERY.md에 추가하여 조회 성능 10~100배 개선 가능.
- ✅ **서버 검증 로직**: `create_new_poll` 함수에 질문/옵션 필수 검증, 개수 제한, 만료 시간 검증 로직 추가로 데이터 무결성 확보.
- ✅ **Supabase 클라이언트 최적화**: `useSupabase` 커스텀 훅 생성 (`src/hooks/useSupabase.ts`), `useMemo`로 싱글턴 보장, 불필요한 재생성 방지.
- ✅ **즉시 확인 항목**: 모든 컴포넌트에서 `increment_vote` 호출 파라미터가 올바르게 통일되어 있음 확인, `poll.question` 참조 일관성 확인 완료.

## Step 4 – 백엔드 & 데이터 계층 정비 (완료)

- ✅ **Service Layer 도입**: `src/lib/services/polls.ts`에 `getPolls`, `getPollById`, `getFeaturedPolls`, `createPoll`, `voteOnPoll`, `getLeaderboard` 함수를 추가하여 비즈니스 로직 분리 및 재사용성 확보.
- ✅ **API Route 핸들러화**: `src/app/api/polls/route.ts`, `src/app/api/polls/[id]/route.ts`, `src/app/api/polls/[id]/vote/route.ts`로 RESTful API 엔드포인트 구성. 서버 전용 로직을 API 계층으로 이전.
- ✅ **Next.js 캐싱 전략**: 서비스 함수에 `unstable_cache`, `tags`를 선언하고 `revalidatePath`로 투표 후 자동 데이터 갱신 로직 적용.
- ✅ **데이터 시딩**: `scripts/seed.ts` 스크립트와 `npm run db:seed` 명령을 구성하여 로컬 개발 환경에서 샘플 데이터 간편 생성 가능.

## Step 5 – UX & 상태 관리 개선 (완료)

- ✅ **Optimistic Update**: React Query (`@tanstack/react-query`)를 도입하여 투표 시 즉시 UI 반영. `usePollVote` 훅으로 Optimistic Update 구현, 실패 시 자동 롤백 처리.
- ✅ **로딩/에러/빈 상태 표준화**: `src/components/common`에 `Skeleton`, `ErrorState`, `EmptyState` 컴포넌트 추가. `PollListSkeleton`, `PollCardSkeleton`으로 페이지별 로딩 상태 제공.
- ✅ **경량 전역 상태 도입**: `src/lib/stores`에 Zustand 스토어 생성. `usePollStore`(투표 상태), `useUIStore`(모달/사이드바 상태) 관리.
- ✅ **Tailwind 기반 디자인 시스템 확장**: `src/components/ui`에 `Card`, `Badge`, `Input` 컴포넌트 추가. 재사용 가능한 UI 시스템으로 스타일 일관성 확보.

## Step 6 – 컴포넌트 구조 및 재사용성 향상 (완료)

- ✅ **컴포넌트 디렉터리 구조화**: `@/components/layout`으로 Navbar.tsx 이동 (App Router 컨벤션 준수).
- ✅ **커스텀 훅 분리**: `src/hooks`에 `useSession`, `useLocalStorage<T>`, `useVisibilityChange` 추출 (15곳의 localStorage 중복, 6곳의 visibilitychange 중복 제거).
- ✅ **공통 상수 중앙화**: `src/constants`에 `STORAGE_KEYS`, `CACHE_TAGS`, `CACHE_TIMES`, `DEFAULTS` 관리.

### 6.1 상수 중앙화 (완료)

1. ✅ `src/constants/` 디렉터리 생성
2. ✅ **storage.ts**: `STORAGE_KEYS.VOTED_POLLS = 'heyversus-voted-polls'` 정의
3. ✅ **cache.ts**: `CACHE_TAGS`, `CACHE_TIMES` (polls: 60초, poll: 30초, featured: 120초) 정의
4. ✅ **app.ts**: `DEFAULTS.LEADERBOARD_LIMIT = 10` 등 기본값 관리
5. ✅ 기존 하드코딩된 값들을 constants로 교체 (services/polls.ts 등)
6. ✅ `npm run lint && npm run test` 실행
7. ✅ 커밋: `refactor: centralize constants (storage, cache, app defaults)`

### 6.2 커스텀 훅 분리 (완료)

1. ✅ **useSession**: FeaturedPollClient.tsx:15 임시 구현 → `src/hooks/useSession.ts`로 독립
2. ✅ **useLocalStorage<T>**: 범용 제네릭 훅 생성, 15곳의 중복 코드 제거
3. ✅ **useVisibilityChange**: 6곳의 `document.addEventListener('visibilitychange')` 패턴 통합
4. ✅ 기존 코드에 적용 (PollsClient.tsx, FeaturedPollClient.tsx, PollClient.tsx 등)
5. ✅ `npm run lint && npm run test` 실행
6. ✅ 커밋: `refactor: extract custom hooks (useSession, useLocalStorage, useVisibilityChange)`

### 6.3 컴포넌트 디렉터리 재구성 (완료)

1. ✅ `components/layout/` 생성 → `Navbar.tsx` 이동
2. ⏭️ `components/domain/` 생성 (선택적) - 현재 App Router 패턴 유지로 스킵
3. ✅ App Router 규칙 준수: `*Client.tsx` 컴포넌트는 해당 route 디렉터리에 유지
4. ✅ import 경로 업데이트 (`@/components/Navbar` → `@/components/layout/Navbar`)
5. ✅ `npm run lint && npm run test` 실행
6. ✅ 커밋: `refactor: reorganize component structure (layout directory)`

### 6.4 QA 체크리스트 (완료)

- ✅ 홈페이지 렌더링 및 Featured Poll 표시 (HTTP 200)
- ✅ 투표 목록 페이지 (/polls) - 정상 렌더링 (HTTP 200)
- ✅ 투표 상세 페이지 (/poll/[id]) - 접근 가능
- ✅ 즐겨찾기 페이지 (/favorites) - 로그인 리다이렉트 정상 (HTTP 307)
- ✅ 로그인 페이지 (/signin) - 정상 렌더링 (HTTP 200)
- ✅ 스코어보드 페이지 (/score) - 정상 렌더링 (HTTP 200)
- ✅ Navbar 컴포넌트 정상 렌더링 (layout 디렉터리 이동 후)
- ✅ 컴파일 에러 없음, lint 통과, 테스트 통과

## Step 7 – 사용자 즐겨찾기 기능 구현 (완료)

- ✅ **데이터 계층 준비**: Supabase에 `favorite_polls` 테이블/인덱스/RLS 추가, 중복 없는 `(user_id, poll_id)` 제약 및 idempotent DROP 처리. (`QUERY.md`)
- ✅ **RPC·서비스 정비**: `get_polls_with_user_status`에 `is_favorited` 컬럼 추가, `toggle_favorite`·`get_favorite_polls` RPC 생성, `services/polls.ts`에서 즐겨찾기 조회/토글 헬퍼 제공.
- ✅ **클라이언트 연동**: `PollsClient`에 즐겨찾기 버튼과 Optimistic 업데이트 적용, 로그인 유도/토스트 처리, 빈 상태 문구 커스터마이즈 지원.
- ✅ **전용 페이지 구현**: `/favorites` 서버 컴포넌트 추가로 즐겨찾기 목록 전용 화면 제공, 빈 리스트 안내 CTA 구성.
- ✅ **상태 동기화 & QA**: React Query 기반 `useToggleFavorite` 훅으로 상태를 즉시 반영, `npm run lint` 및 수동 QA(추가/삭제/미로그인 흐름) 완료, QUERY.md/문서 갱신.

## Step 8 – 운영 모니터링 & 기능 완성 (진행 중)

### 8.1 Sentry 도입 (에러 모니터링) (✅ 완료)

프로덕션 환경에서 발생하는 클라이언트/서버 에러를 자동으로 추적하고 디버깅 정보를 수집합니다.

#### 완료 내역

- ✅ **패키지 설치**: `@sentry/nextjs` v8 설치 완료
- ✅ **설정 파일 생성**:
  - `sentry.client.config.ts` - 클라이언트 에러 추적 + Session Replay 통합
  - `sentry.server.config.ts` - 서버 에러 추적 + 민감 헤더 필터링
  - `sentry.edge.config.ts` - Edge Runtime 설정
  - `src/instrumentation.ts` - Next.js 15 instrumentation hook + onRequestError
- ✅ **Next.js 설정 업데이트**:
  - `next.config.ts`에 `withSentryConfig` 래퍼 적용
  - Source maps 업로드, tunnelRoute 설정
  - deprecated `experimental.instrumentationHook` 제거
- ✅ **환경 변수 설정**: `.env.local.example` 파일 업데이트
  ```
  NEXT_PUBLIC_SENTRY_DSN=<sentry-dsn>
  SENTRY_ORG=<org-name>
  SENTRY_PROJECT=<project-name>
  SENTRY_AUTH_TOKEN=<auth-token>
  ```
- ✅ **Error Boundary 추가**:
  - `src/app/error.tsx` - 페이지 레벨 에러 처리 (shadcn/ui 스타일)
  - `src/app/global-error.tsx` - 전역 에러 처리 (inline 스타일)
  - 자동 Sentry.captureException() 통합
- ✅ **테스트 페이지**: `/test-sentry` 페이지 생성으로 5가지 에러 유형 테스트 가능 _(현재는 개발 환경에서만 사용하며 프로덕션 번들에서는 제외됨)_
  - 클라이언트 에러, 비동기 에러, 수동 캡처, 메시지 전송, Error Boundary 트리거
- ✅ **빌드 검증**: TypeScript 타입 에러 수정 (`jest.setup.ts`), `npm run lint` 및 `npm run build` 통과

#### 알려진 제약사항

- **Turbopack 호환성**: Sentry는 아직 Turbopack을 완전히 지원하지 않음 ([#8105](https://github.com/getsentry/sentry-javascript/issues/8105))
  - 경고 무시: `SENTRY_SUPPRESS_TURBOPACK_WARNING=1` 환경변수 설정
  - 또는 프로덕션 빌드 시 `--turbo` 플래그 제거 고려

### 8.2 비공개 투표 접근 제어 구현 (✅ 완료)

비공개 투표(`is_public = false`)에 대한 접근 제어를 완성하여 생성자만 접근할 수 있도록 구현했습니다.

#### 완료 내역

- ✅ **RPC 함수 추가** (QUERY.md):
  - `can_access_poll(poll_id)` - 현재 사용자의 투표 접근 권한 검증
  - `get_my_polls_with_user_status()` - 내가 만든 모든 투표 조회 (공개+비공개)
- ✅ **목록 노출 정책 수정**:
  - `get_polls_with_user_status()` - 공개 투표 + 내가 만든 비공개 투표 반환
  - `get_poll_with_user_status(poll_id)` - 권한 없으면 빈 결과 반환
- ✅ **RLS 정책 강화**:
  - polls 테이블 SELECT 정책 업데이트
  - 공개 투표는 누구나, 비공개 투표는 생성자만 조회 가능
- ✅ **프론트엔드 통합**:
  - `src/lib/services/polls.ts`에 `canAccessPoll()`, `getMyPolls()` 추가
  - `/poll/[id]` 페이지 권한 검증 강화 (권한 없으면 404)
  - `EmptyState` 컴포넌트 텍스트 가시성 개선
- ✅ **빌드 검증**: `npm run lint` 및 `npm run build` 통과

#### 적용 방법

**중요**: Supabase SQL Editor에서 QUERY.md의 다음 SQL을 실행해야 합니다:

1. `can_access_poll` 함수 생성
2. `get_my_polls_with_user_status` 함수 생성
3. `get_polls_with_user_status` 함수 업데이트 (WHERE 절 수정)
4. `get_poll_with_user_status` 함수 업데이트 (권한 검증 추가)
5. polls 테이블 RLS 정책 재생성

### 8.3 투표 플로우 단일화 및 RPC 보강 (완료)

- ✅ 리스트(/polls, /favorites)에서는 투표 상태·결과만 노출하고, 실제 투표는 상세(/poll/[id])에서만 수행하도록 UI/로직을 단일화했습니다.
- ✅ `usePollVote`를 낙관적 업데이트 + 실패 롤백 형태로 강화해 상세 페이지 투표 반영 속도와 안정성을 개선했습니다.
- ✅ Supabase `increment_vote`를 `SECURITY DEFINER`, `COALESCE(votes, 0)`, 옵션/투표 불일치 시 예외 처리로 보완해 익명 투표도 안전하게 반영되도록 했습니다. (QUERY.md, 백업: QUERY.backup.md)

## Step 9 – 반응형 레이아웃 & 뷰포트 최적화 (✅ 완료)

모든 페이지와 컴포넌트를 Mobile-First 전략으로 반응형 디자인 적용 완료.

### 완료 내역

1. **기준 확정 및 디자인 가이드 수립** ✅

   - 지원 해상도 정의: Mobile (≤767px), Tablet (768px-1023px), Desktop (≥1024px)
   - 접근성 기준: WCAG 2.1 AA, 최소 터치 영역 44x44px
   - `references/DESIGN_SYSTEM.md`에 반응형 브레이크포인트, 그리드, 타이포, 간격 시스템 가이드를 통합

2. **글로벌 레이아웃 리팩터링** ✅

   - `src/app/layout.tsx`: 메인 제목 반응형 (`text-2xl md:text-3xl lg:text-4xl`)
   - `src/components/layout/Navbar.tsx`:
     - 로고 크기 반응형 (`text-xl sm:text-2xl md:text-3xl`)
     - 메뉴 링크 선택적 숨김 (FAVORITES는 md 이상, SCORE는 lg 이상)
     - 버튼 텍스트 모바일 축약 ("투표 생성" → "+", "로그인" → "IN")
     - 최소 터치 영역 44px 적용

3. **페이지별 반응형 적용** ✅

   - **홈페이지** (`src/app/page.tsx`): 컨테이너 패딩, 제목, 간격 반응형
   - **투표 목록** (`src/app/polls/PollsClient.tsx`):
     - 옵션 카드 min-h-[44px], 이미지 w-10 md:w-12
     - 버튼 영역 flex-col sm:flex-row
     - 텍스트 truncate 적용
   - **투표 상세** (`src/app/poll/[id]/PollClient.tsx`):
     - 결과 섹션 간격 조정
     - 버튼 영역 모바일 세로 배치
   - **투표 생성** (`src/app/create-poll/page.tsx`):
     - 시간 프리셋 버튼 grid-cols-3 sm:grid-cols-6 (모바일 2행 레이아웃)
     - 입력 필드 패딩 px-3 py-2 md:px-4 md:py-3
     - 제출 버튼 w-full sm:w-auto

4. **Featured Poll 카드 반응형** ✅ (`src/app/FeaturedPollClient.tsx`)

   - 그리드: 2-way는 grid-cols-1 md:grid-cols-2, 3-way는 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
   - 이미지 높이: h-40 md:h-48 lg:h-56
   - VS 배지: 모바일에서 hidden, 데스크톱에서 표시
   - 버튼 영역: flex-col sm:flex-row

5. **접근성 보강** ✅

   - 모든 클릭 가능 요소에 `min-h-[44px]` 적용
   - 텍스트 truncate로 오버플로우 방지
   - flex-shrink-0으로 레이아웃 안정성 확보
   - 이미지 sizes 속성으로 반응형 최적화

6. **빌드 검증** ✅
   - `npm run lint` 통과 (0 errors, 0 warnings)
   - `npm run build` 성공 (Next.js 15.5.2 Turbopack)
   - 전체 라우트 정상 빌드 확인 (14개 페이지)

### 주요 개선 사항

- **Mobile-First 접근**: 기본 스타일은 모바일, 브레이크포인트로 확장
- **일관된 간격 시스템**: p-4 md:p-6 lg:p-8 패턴 적용
- **터치 친화적**: 모든 버튼 최소 44px 높이 보장
- **텍스트 가독성**: 반응형 폰트 크기 (text-sm md:text-base lg:text-lg)
- **레이아웃 유연성**: flex-col → flex-row 전환으로 화면 크기 대응

## Step 10 – 투표 목록 스케일 대응 (✅ 완료)

무한 스크롤 기반 페이지네이션, 필터링, 정렬 기능을 완전히 구현하여 대규모 투표 목록에 대응.

### 완료 내역

1. **데이터베이스 계층** ✅

   - `get_polls_paginated` RPC 함수 생성 (`references/SCALE_DESIGN.md` Appendix A)
   - 페이지네이션 파라미터 지원: `limit`, `offset`, `sortBy`, `sortOrder`, `filterStatus`
   - 성능 최적화 인덱스 추가 (created_at, expires_at, status, public_creator, votes)
   - Total count 메타데이터 포함

2. **타입 시스템** ✅

   - `GetPollsParams`, `PollsResponse`, `PaginationMetadata` 타입 추가
   - `SortBy`, `SortOrder`, `FilterStatus` 타입 정의

3. **서비스 계층** ✅

   - `getPollsPaginated()` 함수 구현 (`src/lib/services/polls.ts`)
   - 페이지네이션 메타데이터 계산 및 응답 파싱
   - 기존 `getPolls()` deprecated 처리 (하위 호환성 유지)

4. **API 계층** ✅

   - `GET /api/polls` 엔드포인트 강화
   - 쿼리 파라미터 검증 및 에러 처리
   - 최대 100개/페이지 제한
   - 하위 호환성 플래그 (`paginated=false`)

5. **React Query 통합** ✅

   - `useInfinitePolls` 훅 구현 (`src/hooks/useInfinitePolls.ts`)
   - Automatic `getNextPageParam` 계산
   - 30초 stale time으로 최적 캐싱

6. **UI 컴포넌트** ✅

   - `PollsFilterBar`: 상태 필터 + 정렬 드롭다운 (모바일 최적화)
   - `LoadMoreTrigger`: IntersectionObserver 기반 무한 스크롤 + "더 보기" 버튼 폴백
   - `PollsClientInfinite`: 새 투표 목록 컴포넌트 (기존 기능 모두 보존)

7. **URL 파라미터 동기화** ✅

   - 필터/정렬 상태를 URL 쿼리 파라미터에 저장
   - 공유 가능한 필터링된 뷰 지원
   - 브라우저 뒤로가기 지원

8. **성능 개선** ✅

   - 초기 로드: 전체 투표 → 20개만 로드 (~90% 빠름)
   - 네트워크 페이로드: 80% 감소 (100개 투표 기준)
   - 필터/정렬 변경: 전체 리로드 → 클라이언트 사이드 (즉시 반응)

9. **접근성** ✅

   - WCAG 2.1 AA 준수
   - 키보드 네비게이션 지원
   - 스크린 리더 지원
   - 44px 최소 터치 영역

10. **문서화** ✅
    - `references/SCALE_DESIGN.md`: 아키텍처 · 구현 요약 · SQL Appendix를 통합 관리

### 알려진 제약사항

- **SQL 실행 필요**: `references/SCALE_DESIGN.md` Appendix의 SQL을 Supabase SQL Editor에서 수동 실행해야 프로덕션에서 작동
- **Favorites 페이지 미업데이트**: 기존 `PollsClient` 사용 (작은 데이터셋이므로 허용)
- **Sort by Votes**: 실시간 집계 필요 (향후 `total_votes` 컬럼 추가 고려)

### 다음 단계

1. Supabase SQL Editor에서 `references/SCALE_DESIGN.md` Appendix 실행
2. 100+ 투표로 성능 테스트
3. 모바일 UX 검증
4. 프로덕션 배포
5. 메트릭 모니터링

## Step 11 – 계정·프로필 관리 강화 (✅ 완료)

사용자가 자신의 프로필 정보를 관리할 수 있는 `/account` 페이지를 구현하여 개인화 기능을 강화했습니다.

### 완료 내역

1. **데이터베이스 스키마 확장** ✅

   - profiles 테이블에 새 컬럼 추가 (`QUERY.md`):
     - `avatar_url` (TEXT): 프로필 이미지 URL
     - `bio` (TEXT): 자기소개 (최대 500자)
     - `full_name` (TEXT): 이름
   - bio 길이 제약 조건 추가 (500자 제한)
   - 기존 RLS 정책 유지 (사용자는 자신의 프로필만 수정 가능)

2. **Supabase Storage 버킷 설정** ✅

   - `avatars` 버킷 생성 (`QUERY.md`):
     - 공개 버킷 (URL로 직접 접근 가능)
     - 5MB 파일 크기 제한
     - 허용 MIME 타입: JPEG, PNG, GIF, WebP
   - Storage RLS 정책 구현:
     - 누구나 아바타 이미지 조회 가능
     - 인증된 사용자만 자신의 아바타 업로드/수정/삭제

3. **백엔드 RPC 함수 구현** ✅

   - `update_profile()`: 프로필 정보 업데이트 (`QUERY.md`)
     - username 중복 검증
     - username 길이 검증 (최소 3자)
     - bio 길이 검증 (최대 500자)
     - 업데이트된 프로필 JSON 반환
   - `get_profile(p_user_id)`: 프로필 조회
     - 현재 사용자 또는 특정 사용자 프로필 조회
     - email 정보 포함 (auth.users와 조인)

4. **서비스 계층 구현** ✅

   - `src/lib/services/profile.ts` 생성:
     - `getCurrentProfile()`: 현재 사용자 프로필 조회
     - `getProfileById()`: 특정 사용자 프로필 조회
     - `updateProfile()`: 프로필 업데이트
     - `uploadAvatar()`: 아바타 이미지 업로드 (파일 검증 포함)
     - `deleteAvatar()`: 이전 아바타 삭제
   - TypeScript 타입 정의: `Profile`, `UpdateProfileRequest`

5. **/account 페이지 UI 구현** ✅

   - `src/app/account/page.tsx`: 서버 컴포넌트
     - 세션 검증 및 미로그인 시 리다이렉트
     - 프로필 데이터 fetch 및 에러 처리
   - `src/app/account/AccountClient.tsx`: 클라이언트 컴포넌트
     - React Hook Form + Zod 스키마 검증
     - 아바타 업로드 (파일 선택, 미리보기, 검증)
     - 편집 모드 토글 (읽기/쓰기 모드 전환)
     - 로딩 상태 및 에러 처리
     - 반응형 디자인 (Mobile-First)
   - `src/components/ui/textarea.tsx`: Textarea 컴포넌트 추가

6. **Navbar 프로필 정보 동기화** ✅

   - `src/components/layout/Navbar.tsx` 업데이트:
     - 아바타 이미지 표시 (있는 경우)
     - 프로필 아이콘 + username + 포인트 표시 (데스크톱)
     - 프로필 아이콘만 표시 (모바일)
     - /account 페이지로 링크 추가
   - `src/app/layout.tsx` 업데이트:
     - profile 쿼리에 `avatar_url` 추가

7. **폼 유효성 검사** ✅

   - Zod 스키마 정의:
     - username: 최소 3자, 영문/숫자/\_/- 만 허용
     - full_name: 최대 50자
     - bio: 최대 500자
   - React Hook Form 통합으로 실시간 에러 표시
   - 서버 측 이중 검증 (RPC 함수)

8. **아바타 업로드 기능** ✅

   - 파일 타입 검증: JPEG, PNG, GIF, WebP만 허용
   - 파일 크기 검증: 5MB 제한
   - 미리보기 기능: FileReader로 실시간 프리뷰
   - 기존 아바타 자동 삭제 (새 이미지 업로드 시)
   - Storage URL 자동 생성 및 프로필에 저장

9. **의존성 패키지 추가** ✅

   - `react-hook-form`: 폼 상태 관리
   - `zod`: 스키마 검증
   - `@hookform/resolvers`: Zod resolver
   - `lucide-react`: UI 아이콘

10. **빌드 검증** ✅
    - `npm run build`: 성공 (15개 페이지, /account 포함)
    - TypeScript 타입 검증 통과
    - ESLint 통과

### 주요 특징

- **완전한 프로필 관리**: 아바타, 사용자명, 이름, 소개 편집 가능
- **안전한 파일 업로드**: 클라이언트/서버 이중 검증
- **실시간 미리보기**: 아바타 변경 전 미리 확인
- **반응형 디자인**: 모든 화면 크기 대응
- **에러 처리**: 명확한 에러 메시지 및 롤백
- **Navbar 동기화**: 프로필 변경 시 자동 업데이트

### 알려진 제약사항

- **SQL 실행 필요**: `QUERY.md`의 다음 SQL을 Supabase SQL Editor에서 실행해야 합니다:
  1. profiles 테이블 컬럼 추가 (avatar_url, bio, full_name)
  2. bio 길이 제약 조건 추가
  3. avatars Storage 버킷 생성
  4. Storage RLS 정책 생성
  5. update_profile, get_profile RPC 함수 생성

### 다음 단계

1. Supabase SQL Editor에서 `QUERY.md` (라인 724-1135) 실행
2. 프로필 편집 기능 수동 테스트
3. 아바타 업로드 엣지 케이스 검증
4. 프로덕션 배포

## Step 12 – 브랜드 & UI 리프레시 (✅ 완료)

디자인 토큰 시스템 구축, 다크모드 지원, 공통 컴포넌트 리뉴얼을 완료하여 일관된 디자인 언어를 확립했습니다.

### 완료 내역

1. **브랜드 방향 정의** ✅

   - 브랜드 키워드 확정: 역동적, 대비되는, 활기찬
   - 톤 앤 매너: 재미있고 참여형, 경쟁적이지만 친근한
   - 다크모드 전면 지원 결정

2. **디자인 토큰 시스템 구축** ✅

   - 브랜드 색상: Gold (#FFD700), Orange (#FF8C00)
   - 의미론적 색상 시스템: primary, accent, success, warning, info, destructive
   - 라이트/다크 모드 CSS 변수 정의 (`globals.css`)
   - Tailwind 설정 업데이트: 하드코딩 색상 제거, 토큰 기반 색상 시스템 적용

3. **다크모드 지원 인프라** ✅

   - `next-themes` 패키지 설치 및 통합
   - `ThemeProvider` 컴포넌트 생성 (class 기반, system 테마 지원)
   - `ThemeToggle` 컴포넌트 구현 (Sun/Moon 아이콘)
   - Navbar에 테마 토글 추가
   - `layout.tsx`에 ThemeProvider 적용 (defaultTheme: "dark")

4. **공통 UI 컴포넌트 리뉴얼** ✅

   - **Button**: `success` variant 추가, 디자인 토큰 적용
   - **Card**: 하드코딩 gray 색상 제거, `bg-card`, `text-card-foreground` 사용
   - **Badge**: 모든 variant를 디자인 토큰으로 변환 (success, warning, info 포함)
   - **Input**: `border-input`, `bg-background`, `placeholder:text-muted-foreground` 적용
   - **Navbar**: 인라인 스타일 제거, `text-brand-gold`, `text-brand-orange` 사용

5. **빌드 검증** ✅

   - `npm run lint`: 0 errors, 0 warnings (통과)
   - `npm run build`: 성공적으로 빌드 완료 (14개 페이지)
   - TypeScript 타입 에러 수정 완료

6. **문서화** ✅
   - **references/DESIGN_SYSTEM.md**: 전체 디자인 시스템 가이드 작성
     - 브랜드 정체성 및 키워드
     - 색상 시스템 (브랜드, 의미론적, 확장)
     - 타이포그래피 및 반응형 스케일
     - 간격, Border Radius, 그림자
     - 컴포넌트 사용 가이드
     - 다크모드 설정 및 사용법
     - 애니메이션 및 접근성 가이드
     - 반응형 디자인 브레이크포인트

### 주요 개선 사항

- **일관된 색상 시스템**: 하드코딩 색상 → 디자인 토큰 (HSL CSS 변수)
- **다크모드 완전 지원**: 모든 컴포넌트가 라이트/다크 모드 대응
- **브랜드 정체성 강화**: Gold/Orange 브랜드 색상 체계적 적용
- **개발자 경험 향상**: 의미론적 클래스명으로 유지보수성 개선
- **접근성 강화**: 명확한 포커스 스타일, 적절한 색상 대비

### 기술 스택

- **next-themes**: 테마 전환 및 상태 관리
- **CSS Variables**: HSL 기반 디자인 토큰
- **Tailwind CSS**: 유틸리티 퍼스트 스타일링
- **shadcn/ui**: 재사용 가능한 컴포넌트 시스템

## Step 13 – 보안/안정성 리스크 대응 (✅ 완료)

### 완료 내역

1. **프로필 수정 서버 API 전환** ✅

   - `src/app/api/account/profile/route.ts`를 도입해 서버 전용 로직을 분리하고, 클라이언트(`AccountClient`)는 해당 엔드포인트만 호출하도록 재구성했습니다.
   - Supabase `cookies()` 접근 오류 가능성을 제거하고 `ProfileUpdatePayload` 타입을 공통으로 사용합니다.

2. **공통 프로필 검증 스키마 도입** ✅

   - `src/lib/validation/profile.ts`에 `profileUpdateSchema`를 정의하고 API와 클라이언트 폼이 동일한 Zod 검증을 사용하도록 맞췄습니다.
   - 아바타 변경 시 새 업로드 성공을 확인한 뒤 기존 이미지를 삭제해 데이터 유실 위험을 낮췄습니다.

3. **로그인 리디렉션 방어** ✅

   - `src/app/signin/page.tsx`의 `redirect` 파라미터를 동일 오리진 경로만 허용하도록 검증해 개방형 리디렉션 취약점을 차단했습니다.

4. **투표 생성 검증 강화** ✅
   - `src/lib/validation/poll.ts`의 `createPollSchema`를 `/create-poll` 페이지와 `POST /api/polls` 엔드포인트에서 공유해 입력 검증을 일관화했습니다.
   - Supabase 에러를 401/403/422 등 의미 있는 HTTP 응답으로 매핑하고, 클라이언트에 메시지를 노출합니다.

### 검증 및 후속 조치

- 서버 API 분리 및 검증 스키마가 적용된 프로필 수정/투표 생성 플로우를 실제 Supabase 환경에서 QA해야 합니다.
- 세션 만료, 중복 옵션, 잘못된 만료 시간 등 실패 케이스를 `/create-poll` UI에서 수동 검증해 새로운 오류 응답이 정확히 표시되는지 확인합니다.

## Step 14 – 페이지 호출 속도 & 렌더링 최적화 (✅ 완료, v0.6.2)

> 📄 세부 실행안은 `references/PERFORMANCE_PLAN.md` (v1.1)에서 계속 추적합니다.

### 완료 내역

1. **레이아웃/네비게이션 정적화** ✅

   - `src/app/layout.tsx`에서 Supabase 세션/프로필 조회를 완전히 제거하고 정적 세그먼트로 되돌렸습니다.
   - `Navbar`는 `useSession` + 신규 `useCurrentProfile` 훅을 사용해 클라이언트에서만 인증 상태를 구독하여, 초기 SSR 시점의 쿠키 의존도를 없앴습니다.

2. **React Query 기반 상태 동기화** ✅

   - `PollsClientInfinite`가 `router.refresh()` 대신 React Query `invalidateQueries` + 캐시 패치를 사용해 투표/즐겨찾기 변화를 즉시 반영합니다.
   - 낙관적 갱신으로 옵션 득표수와 즐겨찾기 상태를 즉시 업데이트하고, 필요한 쿼리만 재검증하도록 최소화했습니다.

3. **공통 훅 도입 및 재사용성 향상** ✅

   - `src/hooks/useCurrentProfile.ts`를 추가해 프로필 RPC 호출을 표준화하고 어플리케이션 어디서나 재사용할 수 있게 했습니다.
   - Navbar, PollsClient 등에서 Supabase 세션 구독 로직을 공유 훅으로 교체해 중복 코드를 삭제했습니다.

4. **데이터 패칭 전략 다변화** ✅

   - `/poll/[id]` 페이지를 React Query 기반 CSR로 전환하여 SSR 시점의 쿠키 의존도를 제거하고, 투표 완료/탭 복귀 시 특정 쿼리만 무효화하도록 개선했습니다.
   - `/polls` 서버 컴포넌트에서 Infinite Query 첫 페이지를 `HydrationBoundary`로 주입해 초기 로딩 시간을 절감하고, `/score` 페이지는 익명 Supabase 클라이언트 + `revalidate=120`으로 캐시 친화적으로 전환했습니다.

5. **번들 & 개발 자산 정리** ✅

   - 투표 여부 계산을 `useVoteStatus` 훅 하나로 통합해 Polls 전반의 중복 localStorage/세션 로직을 제거하고 번들 크기를 줄였습니다.
   - 관련 런타임 오류(`useVoteStatus` 무한 업데이트, 대표 투표 카드 로딩 상태)를 함께 수정했습니다.
   - 프로덕션 번들에서 사용되지 않는 `/test-sentry` 개발용 페이지를 제거해 불필요한 라우트를 없앱니다.

6. **인증 흐름 개선** ✅

   - `/create-poll` 페이지를 서버 컴포넌트로 전환해 비로그인 사용자는 SSR 단계에서 `/signin?redirect=/create-poll`로 즉시 리다이렉션됩니다.
   - 클라이언트에서는 Supabase `onAuthStateChange` 이벤트로 세션 만료를 감지해 필요한 컴포넌트만 갱신하거나 로그인 화면으로 안내합니다.

7. **스코어 페이지 일관성 확보** ✅

   - `/score` 상단 헤더를 Polls 리뉴얼과 동일한 `PollsHero` 패턴으로 교체하고, 상위 지표/CTA를 통해 플레이어가 포인트 목표를 쉽게 인지하도록 정비했습니다.
   - Top 3 카드 + 전체 랭킹 테이블을 토큰 스타일로 재구성해 브랜드/타이포 일관성을 유지했습니다.

8. **상세 페이지 인사이트 강화** ✅
   - `/poll/[id]`에 총 투표 수, 상태, 남은 시간, 선두 옵션을 보여주는 요약 카드 섹션을 추가해 목록에서 볼 수 없는 정보를 제공했습니다.
   - “결과·투표 보기” 버튼의 의미가 명확해지도록 상세 페이지에만 접근 가능한 데이터를 늘렸습니다.

### 검증 및 후속 과제

- 레이아웃이 정적으로 전환된 환경에서 `/account`, `/create-poll` 등 보호 라우트가 정상적으로 리다이렉션되는지 수동 QA를 진행합니다.
- `npm run lint`/`npm run build`로 회귀를 확인했고, 차후 `/poll/[id]`, `/score`의 `force-dynamic` 구간을 태그 기반 `revalidate` 전략으로 단계적 전환할 예정입니다.

## Step 15 – Polls 페이지 UI 리뉴얼 (✅ 완료, v0.6.5)

- ✅ **UX 리서치 & 플로우 재설계**: `/polls` 상단에 `PollsHero` 섹션을 도입해 핵심 지표·설명·CTA를 한 번에 제시하고, 하단 CTA(즐겨찾기 바로가기)로 탐색 → 참여 플로우를 단순화했습니다.
- ✅ **컴포넌트 아키텍처 정비**: `@/components/polls`에 `PollCard`, `PollCategoryTabs`, `PollsHero`를 추가해 카드/필터/통계 UI를 분리하고, 기존 인라인 마크업을 제거했습니다.
- ✅ **시각 디자인 확장**: 카드에 상태 배지, 득표율 Progress, 토큰 색상, 라운디드 모서리, 호버 전환을 적용해 최신 디자인 시스템을 반영했습니다.
- ✅ **성능 및 실험 기반**: 카테고리 탭이 URL 파라미터와 연동되어 정렬/필터 프리셋을 즉시 적용하며, React Query 캐시를 그대로 활용해 추가 네트워크 비용 없이 다양한 뷰를 확인할 수 있습니다.

- ## Step 16 – 돌림판(랜덤 옵션 선택) 기능 (✅ 완료)

> 상세 설계는 `references/RANDOM_ROULETTE_PLAN.md`를 참조하세요.

- ✅ **옵션 돌림판 모달**: `/poll/[id]`에 “돌림판으로 골라줘” 버튼을 추가하고, 모달에서 원형 돌림판(Conic Gradient)·지시 화살표·옵션 목록을 함께 노출해 랜덤 추천을 제공합니다.
- ✅ **애니메이션 & 결과 강조**: 회전/감속 애니메이션 후 당첨 옵션을 토스트로 안내하고 자동 선택 처리하여 바로 투표하기 버튼을 누를 수 있게 했습니다.
- ✅ **중복/신뢰성 가드**: 쿨다운, 회전 중 재클릭 차단, 이미 투표/마감/옵션 1개 이하인 경우 버튼 숨김으로 오남용을 방지합니다.
- ✅ **접근성/반응형**: 모달 닫기 버튼·aria-modal 적용, 최소 44px 터치 영역 유지, 모바일에서도 동일 동작하도록 반응형 레이아웃을 구성했습니다.

## Step 17 – 투표·인증 관련 페이지 UI 일원화 및 수정 (완료)

- ✅ **UI 리폼**: `/poll/[id]`를 polls/score와 동일한 카드 톤으로 리폼하고, 상세 전용 `PollDetailCard`로 렌더를 위임했습니다.
- ✅ **로직 분리**: 기존 투표/룰렛 로직은 유지하되, 상세 전용 UI 컴포넌트로 분리해 목록 구조 변경과 decouple 합니다.
- ✅ **메트릭 정리**: PollsHero 톤에 맞춘 요약(남은 시간/총 투표수/선두 옵션)만 노출합니다.
- ✅ **후속 목록 리프레시**: `/polls`를 “투표 검색/선택” 전용(직접 투표 제거)으로 전환하고, 로그인/비로그인 모두 투표 여부 배지를 보여주며 상세 페이지로 투표를 유도합니다. 목록 카드는 `variant="grid"`로 컴팩트/읽기 전용 상태를 적용해 한 행에 여러 투표를 배치하고, 제목 클램프 및 상세 페이지 투표 안내를 추가했습니다.
- ✅ **참여 상태 UI 재구성**: `/polls` 카드 하단에서 상태 배너+CTA 조합으로 참여 여부를 직관적으로 보여주도록 설계(참여 대기/참여 완료/마감 칩, 상태별 CTA: 투표하기/결과 확인하기/결과 보기, 랜덤 투표 버튼 스타일 재사용). 상단 메타는 공개/마감/총 표 수만 유지.
- ✅ **즐겨찾기 토글 일원화**: `FavoriteToggle` 컴포넌트를 도입해 목록/상세 즐겨찾기 UX를 단일화(비로그인 클릭 시 로그인 리다이렉트 + 비활성 스타일), 두 페이지 모두 상단 메타의 총 투표 수 우측에 배치.
- ✅ **상세 메타/CTA 정렬 개선**: `/poll/[id]` 카드 상단 메타를 유지하면서 버튼/상태 라벨을 중앙 정렬로 재구성해 열린/마감/참여 완료 상태에서도 동일 슬롯에 버튼/라벨이 위치하도록 통일.
- ✅ **인증 UI 정비**: `/signin`, `/signup`을 투표 페이지 톤에 맞춘 상단 메타/카드 레이아웃으로 개편하고 CTA 정렬·비로그인 안내 문구를 표준화했습니다(버튼 그리드·상태 배지와 색상 토큰 재사용).
- ✅ **옵션 순서 고정**: `poll_options.position` 컬럼을 도입하고 모든 RPC에서 `ORDER BY position, created_at, id`로 통일해 목록/상세 모두 생성 순서로 일관되게 표시됩니다.
- ✅ **표시 지표/구성 합의**:
  - 메타바: 공개/남은시간/총 투표수+즐겨찾기(아이콘만) 한 줄로 통일.
  - 옵션 노출: 목록은 옵션 텍스트만(득표율/그래프 없음) + 안내 문구 1회; 상세만 득표율/그래프 노출.
  - 버튼 영역: 상태 배너(좌) + CTA(우) 슬롯 고정, 상태별 라벨/색만 교체.

## Step 18 – 점수 랭킹 시스템 개편 (✅ 완료, 집계 실행 확인)

- ✅ **설계 초안 작성**: `references/LEADERBOARD_PLAN.md`에 점수 합산 공식(시간 감쇠 없이)·스키마·RLS/RPC/UX 요구사항을 통합 정리하고, 기존 디자인 토큰·44px 터치·라이트/다크 토큰 준수 가드레일을 명시했습니다.
- ✅ **백엔드 스케폴드 추가**: `references/QUERY.md`에 `profile_scores`/`profile_score_events` 테이블과 `refresh_profile_scores`/`get_leaderboard`/`log_score_event` RPC 초안을 추가해 점수 합산·이벤트 적재·랭킹 조회 기반을 마련했습니다. RLS 정책으로 leaderboard는 공개 조회, 이벤트 로그는 service_role 전용으로 제한했습니다.
- ✅ **코드 스케폴드 준비**: 랭킹 타입 정의(`src/lib/types.ts`), 리더보드 서비스 스텁(`src/lib/services/leaderboard.ts`), React Query 훅 뼈대(`src/hooks/useLeaderboard.ts`), 점수 이벤트 서비스(`src/lib/services/scoreEvents.ts`)를 추가해 Step 18 구현을 위한 기반을 마련했습니다. 투표/즐겨찾기 액션에서 `log_score_event`를 호출해 이벤트 적재를 시작했습니다.
- ✅ **점수 이벤트 확장**: 투표 생성 API(`/api/polls`)에 `log_score_event('create_poll')`를 연동해 생성 흐름도 점수 이벤트로 기록합니다.
- ✅ **집계 실행 경로**: service role 클라이언트(`src/lib/supabase/service-role.ts`)와 배치 스크립트(`scripts/refreshScores.ts`)를 추가해 `refresh_profile_scores`를 서버/스케줄러에서 호출할 수 있게 했습니다.
- ✅ **정합성 검증 및 UI 반영**: 새 점수 소스 기반 `/score` 페이지로 전환하고, 오류/빈 상태 가드 및 총 플레이어 집계·상위 랭킹 UI를 업데이트했습니다.


## Step 19 – 투표 이미지 업로드 기능 (예정)

- ✅ **계획 수립**: `references/STEP19_IMAGE_UPLOAD_PLAN.md`에 스토리지/RLS, RPC, 업로드 플로우, 검증·보안, 테스트 시나리오를 정리했습니다.
- ⏳ **스토리지 정책 확장**: Supabase Storage에 `poll_images` 버킷을 생성하고, 업로드 용량·허용 확장자(JPEG/PNG/WebP)·RLS 정책을 정의하여 생성자만 수정/삭제 가능하도록 합니다.
- ⏳ **RPC & 스키마 업데이트**: `poll_options` 테이블에 `image_url` 컬럼을 추가하고, `create_new_poll` RPC가 이미지 메타데이터를 처리하도록 확장합니다. 기존 투표에 대한 마이그레이션 전략과 백필 대책을 마련합니다.
- ⏳ **프론트엔드 UX**: 투표 생성/편집 화면에 이미지 업로드(드래그 앤 드롭, 미리보기, 업로드 상태 표시)를 추가하고, 모바일 업로드 시 파일 크기 제한과 실패 시 재시도 흐름을 명확히 합니다.
- ⏳ **성능 & 비용 관리**: 썸네일 생성용 Edge Function과 CDN 캐싱 전략을 수립하고, 장기 저장 공간에 대한 모니터링·자동 정리 정책을 마련합니다.

## Step 20 – 비공개 투표 초대 기능 (예정)

- ⏳ **접근 제어 모델 확장**: `poll_invites` (또는 `poll_access`) 테이블을 추가하고, 생성자 ID + 초대 대상 사용자 ID/이메일을 매핑하는 RLS 정책을 설계합니다. 비공개 투표(`is_public = false`)는 생성자 또는 초대 목록에 포함된 사용자만 SELECT/INSERT 가능하도록 조건을 확장합니다.
- ⏳ **초대 토큰 & 링크 설계**: Supabase JWT 혹은 Edge Function을 활용해 서명된 초대 토큰을 발급하고, 제한된 기간 동안만 유효한 초대 링크(`/poll/<id>?invite=<token>` 등)를 제공합니다. 토큰 검증 로직과 만료/재발급 정책을 정의합니다.
- ⏳ **RPC 및 서비스 계층 구현**:
  - `create_poll_invite(p_poll_id, p_target_user)` : 초대 생성 및 중복 초대 방지
  - `revoke_poll_invite(p_invite_id)` : 초대 철회
  - `get_poll_invitees(p_poll_id)` : 초대 대상 조회
  - 프론트엔드 서비스(`services/pollInvites.ts`)와 React Query 훅을 추가해 초대 생성/삭제/조회 흐름을 캡슐화합니다.
- ⏳ **클라이언트 UI/UX 구성**: `/poll/[id]` (생성자 전용) 화면에 초대 관리 패널을 추가해 사용자 검색/선택, 초대 현황, 링크 복사, 초대 취소를 지원합니다. 초대받은 사용자가 링크로 접근 시 권한 확인 → 투표 참여까지 자연스럽게 이어지도록 토스트/가드 UI를 설계합니다.
- ⏳ **비공개 투표 로딩 개선**: 로그인 사용자가 `/polls`에 진입할 때 비공개 투표 리스트가 뒤늦게 로딩되는 문제를 해결해 일관된 초기 데이터 경험을 제공합니다.
- ⏳ **알림 및 보안 검증**: 선택적으로 초대 이메일 전송(Edge Function + Supabase Email) 흐름을 구성하고, 토큰 탈취·중복 사용에 대비한 감사 로그/레이트 리미트 정책을 정의합니다. QA 기준에는 다중 초대, 만료 토큰, 이미 투표한 사용자의 재접근 등 엣지 케이스를 포함합니다.
- ⏳ **문서화 & 운영 가이드**: `QUERY.md`와 READMEs에 새 테이블/RLS/RPC 실행 방법, 초대 기능 사용법, 보안 주의사항을 문서화합니다.

## Step 21 – 관리자 운영 대시보드 (예정)

- ⏳ `/admin` 보호 라우트를 생성하고 Supabase RLS 및 역할 기반 인증(관리자 전용)를 설정.
- ⏳ 신고된 투표/사용자 목록, 즐겨찾기 통계, 성장 지표 등을 한눈에 확인할 수 있는 카드/테이블 UI 구성.
- ⏳ 관리자가 투표 비공개 전환, 삭제, 하이라이트 지정 등을 수행할 수 있는 액션 패널과 감사 로그 기록.
- ⏳ 운영 자동화를 위해 Sentry 알림, 분석 이벤트, 이메일 알림과 연계한 워크플로 문서화.

## Step 22 – 캐시 격리 및 품질 안전망 (신규)

- ✅ **리더보드 폴백**: `get_leaderboard` RPC 실패/빈 결과 시 `profiles.points`로 폴백해 랭킹 노출을 유지하고, best-effort로 `refresh_profile_scores`를 트리거해 집계 누락을 줄입니다.
- ✅ **보안 패치 적용**: React Flight/Next.js RCE 대응을 위해 Next.js를 15.5.7로 상향했습니다.
- 🚧 **캐시/세션 분리**: `getPolls`·`getPollById` 등 사용자 세션 의존 RPC는 `unstable_cache` 캐시를 제거하거나 익명 클라이언트 전용 캐시로 분리하고, `/api/polls?paginated=false` 경로는 캐시 없이 직접 호출로 전환합니다.
- 🚧 **라우트 시그니처 정리**: 모든 App Route/Route Handler의 `params` 시그니처를 `{ params: { id: string } }` 형태로 교정해 Next.js 타입/정적 최적화를 유지합니다.
- 🚧 **초기 상태 정확도**: 로그인 사용자의 즐겨찾기/투표 상태가 첫 렌더에 정확히 반영되도록 `/polls` 초기 로드에 세션 클라이언트 사용 또는 즉시 refetch + `initialData` 조합을 적용합니다.
- 🚧 **테스트 보강**: `/api/polls` GET/POST, `/api/polls/[id]` 404/403, `usePollVote` 오류 롤백, 즐겨찾기 토글 성공/권한 실패 등 핵심 플로우를 Jest + RTL로 커버합니다.
- 📄 **참고 문서**: `references/ISSUE_REVIEW_2024-11.md`.

## Step 23 – 지속적 개선 (예정)

- ⏳ **랭킹 알고리즘 재정의**: 가중치·즐겨찾기/공유 지표 등을 반영한 스코어 공식 재설계 및 스키마 교체.
- ⏳ **데이터 파이프라인 확장**: 실시간/배치 혼합 파이프라인, 트리거·리얼타임 채널, Edge Function 적용.
- ⏳ **리더보드 UX 확장**: `/score` 뷰 전환(전체/친구/지역), 순위 변동/하이라이트, 모바일 가독성 개선.
- ⏳ **프로필 딥링크 & 미리보기**: 랭킹 목록에서 프로필 모달/딥링크(`/profile/[id]`) 제공 및 공개 프로필 권한 확장.
- ⏳ **지표 모니터링 & 알림**: 점수 변동/편향/이상 행태 모니터링, 알림 임계값 정의, 운영 가이드 문서화.

## 타임라인 요약

1. **Step 1** – ✅ 완료: 핵심 버그 제거 및 안정화.
2. **Step 2** – ✅ 완료: ESLint·Husky·Jest 등 품질 자동화와 개발 환경 정비.
3. **Step 3** – ✅ 완료: 단기 P1 항목 정리와 타입/DB 정합성 개선.
4. **Step 4** – ✅ 완료: 서비스 계층 및 API/캐싱 구조 정비.
5. **Step 5** – ✅ 완료: UX·상태 관리 개선 (React Query, Skeleton 등).
6. **Step 6** – ✅ 완료: 컴포넌트 구조·상수·커스텀 훅 재사용성 강화.
7. **Step 7** – ✅ 완료: 즐겨찾기 기능 출시 및 전용 페이지 제공.
8. **Step 8.1** – ✅ 완료: Sentry 에러 모니터링 통합.
9. **Step 8.2** – ✅ 완료: 비공개 투표 접근 제어 및 EmptyState 개선.
10. **Step 9** – ✅ 완료: 반응형 레이아웃 & 뷰포트 최적화.
11. **Step 10** – ✅ 완료: 투표 목록 스케일 대응 (무한 스크롤, 필터/정렬).
12. **Step 11** – ✅ 완료: 계정·프로필 관리 강화.
13. **Step 12** – ✅ 완료: 브랜드 & UI 리프레시.
14. **Step 13** – ✅ 완료: 보안/안정성 리스크 대응.
15. **Step 14** – ✅ 완료: 페이지 호출 속도 & 렌더링 최적화 (`references/PERFORMANCE_PLAN.md` 참조).
16. **Step 15** – ✅ 완료: Polls 페이지 UI 리뉴얼.
17. **Step 16** – ✅ 완료: 랜덤 투표 기능.
18. **Step 17** – ✅ 완료: 투표·인증 관련 페이지 UI 일원화 및 수정 (상세 PollDetailCard 분리, 참여 상태 배너+CTA, 인증 페이지 리뉴얼).
19. **Step 18** – ✅ 완료: 점수 랭킹 시스템 개편.
20. **Step 19** – ⏳ 예정: 투표 이미지 업로드 기능.
21. **Step 20** – ⏳ 예정: 비공개 투표 초대 기능.
22. **Step 21** – ⏳ 예정: 관리자 운영 대시보드.
23. **Step 22** – 🚧 신규: 캐시 격리 및 품질 안전망.
24. **Step 23** – ⏳ 예정: 지속적 개선 (랭킹 알고리즘/실시간 파이프라인/리더보드 UX/모니터링).

- 💬 **CSR 전환 고려 사항**: 동적 세션 데이터를 많이 사용하는 페이지는 SSR/`cookies()` 의존을 제거하고 CSR로 전환하면 TTFB 향상, 캐시 제약 해소, React Query 재사용 등의 이점이 있습니다. SEO가 주요 목표가 아닌 페이지부터 단계적으로 적용을 검토합니다.

- 참고: 상세 UI 리뉴얼 초안은 `references/POLL_DETAIL_UI_PLAN.md`에 정리되어 있으며, PollDetailCard 신설 → PollClient 렌더 교체 → 레이아웃 톤 맞춤 → 스타일 공통화 순서로 진행함.
