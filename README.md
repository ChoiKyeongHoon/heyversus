# Heyversus

🔗 Link : https://heyversus.vercel.app/
📦 Version : v0.6.1

**Heyversus**는 사용자가 직접 투표를 생성하고 참여할 수 있는 동적인 웹 애플리케이션입니다. Next.js와 Supabase를 기반으로 구축되어 있으며, 실시간 투표 결과와 사용자 인증, 포인트 시스템을 제공합니다.

## ✨ 주요 기능

- **사용자 인증**: Supabase Auth를 이용한 간편한 회원가입, 로그인, 로그아웃 기능.
- **투표 생성 및 관리**:
  - **다양한 옵션**: 질문과 여러 선택지를 포함하는 투표를 생성할 수 있습니다.
  - **공개/비공개 설정**: 투표를 모든 사람이 참여할 수 있도록 공개하거나, 로그인한 사용자만 참여하도록 제한할 수 있습니다.
  - **만료 시간 설정**: 투표 마감 시간을 설정하여 기간이 지난 투표는 자동으로 종료됩니다.
- **실시간 투표 시스템**:
  - **익명 투표**: 공개 투표는 로그인하지 않은 사용자도 참여할 수 있습니다.
  - **중복 투표 방지**: 로그인 사용자는 DB를 통해, 비로그인 사용자는 로컬 스토리지를 통해 중복 투표를 효과적으로 방지합니다.
- **대표 투표**: 관리자가 지정한 '오늘의 투표'를 메인 페이지에 노출하여 사용자 참여를 유도합니다.
- **포인트 및 랭킹**: 투표에 참여할 때마다 포인트를 획득하고, 다른 사용자들과의 순위를 `SCORE` 페이지에서 확인할 수 있습니다.
- **즐겨찾기 관리**: 로그인 사용자는 관심 있는 투표를 즐겨찾기에 추가하고 `/favorites` 페이지에서 모아볼 수 있습니다.
- **프로필 관리**: `/account` 페이지에서 아바타 이미지, 사용자명, 이름, 자기소개를 편집할 수 있으며, 변경사항은 즉시 Navbar에 반영됩니다.
- **사용자 경험(UX) 최적화**:
  - **다크/라이트 모드**: 사용자 선호도에 맞는 테마를 제공하고 실시간으로 전환할 수 있습니다. 시스템 설정을 자동으로 감지하며, Navbar의 토글 버튼으로 즉시 변경 가능합니다.
  - **그라디언트 디자인**: 모든 버튼과 배지에 그라디언트 효과를 적용하여 시각적으로 매력적이고 현대적인 UI를 제공합니다.
  - **신속한 피드백**: `sonner` 라이브러리를 활용하여 직관적인 Toast 알림을 제공합니다.
  - **자동 리디렉션**: 로그인 후 이전에 보던 페이지로 자동 이동하여 사용 흐름이 끊기지 않도록 합니다.
  - **데이터 자동 갱신**: 페이지에 다시 방문했을 때 최신 투표 데이터를 자동으로 불러와 보여줍니다.
  - **반응형 디자인**: Mobile-First 전략으로 모든 기기에서 최적화된 경험을 제공합니다 (360px~1920px).

## 🛠️ 기술 스택

- **프레임워크**: Next.js 15 (App Router)
- **언어**: TypeScript
- **스타일링**: Tailwind CSS v4
- **백엔드 (BaaS)**: Supabase (Auth, PostgreSQL, Storage, Edge Functions)
- **UI 컴포넌트**: shadcn/ui, Tailwind CSS 유틸리티 + `class-variance-authority`
- **폼 & 검증**: react-hook-form, Zod, @hookform/resolvers
- **아이콘**: lucide-react
- **데이터 페칭**: `@tanstack/react-query`
- **상태 관리**: React Query 캐시, Zustand 스토어, Supabase Session Provider
- **테마 관리**: next-themes (다크/라이트 모드)
- **폰트 최적화**: `next/font` (Inter)
- **알림**: Sonner (Toast notifications)
- **에러 모니터링**: Sentry (Error tracking, Performance monitoring, Session replay)
- **코드 품질**: ESLint, Prettier, Husky, lint-staged
- **테스트**: Jest, React Testing Library
- **배포**: Vercel

## 📁 프로젝트 구조

```
/
├── public/              # 정적 에셋 (이미지, 폰트 등)
├── src/
│   ├── __tests__/          # Jest + RTL 테스트 코드
│   ├── app/               # Next.js App Router 페이지 및 레이아웃
│   │   ├── api/           # RESTful API Route handlers
│   │   ├── page.tsx       # 메인 랜딩 페이지 (대표 투표)
│   │   ├── signin/        # 로그인 페이지
│   │   ├── signup/        # 회원가입 페이지
│   │   ├── create-poll/   # 투표 생성 페이지
│   │   ├── polls/         # 전체 투표 목록 페이지
│   │   ├── favorites/     # 즐겨찾기한 투표 목록 페이지
│   │   ├── poll/[id]/     # 투표 상세 및 결과 페이지
│   │   ├── account/       # 프로필 관리 페이지
│   │   ├── score/         # 사용자 랭킹(스코어보드) 페이지
│   │   └── globals.css    # 글로벌 스타일 및 디자인 토큰
│   ├── components/        # 재사용 가능한 UI 컴포넌트
│   │   ├── common/        # 공통 UI 컴포넌트 (Skeleton, ErrorState, EmptyState)
│   │   ├── layout/        # 레이아웃 컴포넌트 (Navbar)
│   │   ├── ui/            # shadcn/ui 기본 컴포넌트 (Button, Card, Badge, Input)
│   │   ├── theme-provider.tsx  # next-themes Provider
│   │   └── theme-toggle.tsx    # 다크/라이트 모드 토글 버튼
│   ├── constants/         # 애플리케이션 상수 (storage, cache, defaults)
│   ├── hooks/             # 재사용 가능한 커스텀 훅
│   │   ├── useSession.ts          # Supabase 세션 관리
│   │   ├── useLocalStorage.ts     # 타입 안전 localStorage 동기화
│   │   ├── useVisibilityChange.ts # 페이지 가시성 감지
│   │   ├── useSupabase.ts         # Supabase 클라이언트 최적화
│   │   ├── usePollVote.ts         # 투표 참여 Optimistic Update
│   │   └── useToggleFavorite.ts   # 즐겨찾기 토글
│   ├── lib/               # 공통 유틸리티, Supabase 클라이언트 및 서비스 계층
│   │   ├── services/      # Supabase RPC를 감싼 비즈니스 로직
│   │   └── stores/        # Zustand 기반 전역 상태
│   ├── providers/         # React Query 등 글로벌 Provider 구성
│   ├── instrumentation.ts # Sentry 등 Next.js instrumentation 훅
│   └── middleware.ts      # Supabase 세션 관리 미들웨어
├── QUERY.md             # 데이터베이스 스키마 (SQL)
├── ROADMAP.md           # 개발 로드맵 및 진행 현황
├── references/          # 참고 문서 및 가이드 (디자인 시스템, SQL 스크립트 등)
└── README.md            # 프로젝트 문서
```

## 🚀 시작하기

1. 저장소를 클론합니다.
   ```bash
   git clone https://github.com/ChoiKyeongHoon/heyversus.git
   cd heyversus
   ```
2. 의존성을 설치합니다.
   ```bash
   npm install
   ```
3. 환경 변수를 설정합니다. `.env.local` 파일을 생성하고 아래 키를 채웁니다.

   ```bash
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<optional-service-role-key-for-seeding>

   # Sentry (선택사항 - 에러 모니터링)
   NEXT_PUBLIC_SENTRY_DSN=<your-sentry-dsn>
   SENTRY_ORG=<your-sentry-org>
   SENTRY_PROJECT=<your-sentry-project>
   SENTRY_AUTH_TOKEN=<your-sentry-auth-token>
   ```

   `.env.local.example` 파일을 참고하세요.

4. 개발 서버를 실행합니다.
   ```bash
   npm run dev
   ```
5. (선택) 샘플 데이터를 넣으려면 Supabase에 로그인된 상태에서 시딩 스크립트를 실행합니다.
   ```bash
   npm run db:seed
   ```
6. 변경 사항을 커밋하기 전에 린트를 실행합니다.
   ```bash
   npm run lint
   ```
7. Jest 기반 단위 테스트를 실행하려면 아래 명령을 사용합니다.
   ```bash
   npm run test
   ```

## 📊 데이터베이스 스키마

`QUERY.md` 파일은 전체 데이터베이스 스키마를 정의합니다. 주요 테이블 간의 관계는 다음과 같습니다.

```mermaid
erDiagram
    users ||--|{ profiles : "has one"
    users ||--o{ polls : "creates"
    users ||--o{ user_votes : "casts"

    polls ||--|{ poll_options : "contains"
    polls ||--o{ user_votes : "is voted on"

    poll_options ||--o{ user_votes : "is chosen in"

    users {
        UUID id PK
        string email
        timestamptz created_at
    }

    profiles {
        UUID id PK
        string username
        string avatar_url
        string bio
        string full_name
        int points
        timestamptz updated_at
    }

    polls {
        UUID id PK
        text question
        UUID created_by
        boolean is_public
        boolean is_featured
        timestamptz created_at
        timestamptz expires_at
        varchar status
    }

    poll_options {
        UUID id PK
        UUID poll_id
        text text
        int votes
        text image_url
    }

    users ||--o{ favorite_polls : "favorites"
    polls ||--o{ favorite_polls : "is favorited"

    user_votes {
        UUID id PK
        UUID user_id
        UUID poll_id
        UUID option_id
        timestamptz created_at
    }

    favorite_polls {
        UUID id PK
        UUID user_id
        UUID poll_id
        timestamptz created_at
    }
```

## 📌 업데이트 기록

### v0.6.1

- **프로필 수정 보안 강화**: `AccountClient`가 서버 전용 서비스를 직접 호출하지 않도록 `/api/account/profile` 라우트로 로직을 이전하고, 서버/클라이언트 모두 `profileUpdateSchema`로 입력을 검증합니다. 아바타는 업로드 성공 후 기존 이미지를 삭제해 데이터 유실 가능성을 줄입니다.
- **로그인 리디렉션 검증 추가**: `/signin` 페이지의 `redirect` 파라미터를 동일 오리진 경로만 허용하도록 필터링해 오픈 리디렉션 취약점을 차단했습니다.
- **투표 생성 검증 일원화**: `/create-poll` 클라이언트가 `/api/polls` REST 엔드포인트를 호출하도록 정비하고, `createPollSchema` 검증을 서버/클라이언트에서 공유합니다. Supabase 오류는 401/403/422 등 의미 있는 HTTP 응답으로 변환해 UI에 그대로 노출합니다.
- **후속 권장 사항**: 실제 Supabase 환경에서 프로필 수정과 투표 생성 플로우를 QA하고, 세션 만료·잘못된 만료 시간·중복 옵션 등의 실패 시나리오가 UI에 제대로 반영되는지 확인합니다.

### v0.6.0

- **계정·프로필 관리 시스템 구축**: 사용자가 자신의 프로필 정보를 관리할 수 있는 `/account` 페이지 구현으로 개인화 기능 강화.
- **데이터베이스 스키마 확장**:
  - profiles 테이블에 `avatar_url`, `bio` (최대 500자), `full_name` 컬럼 추가
  - bio 길이 제약 조건 추가 (500자 제한)
  - 기존 RLS 정책 유지 (사용자는 자신의 프로필만 수정 가능)
- **Supabase Storage 통합**:
  - `avatars` 공개 버킷 생성 (5MB 파일 크기 제한)
  - JPEG, PNG, GIF, WebP 이미지 타입만 허용
  - Storage RLS 정책 구현 (조회는 공개, 업로드/수정/삭제는 본인만)
- **백엔드 RPC 함수**:
  - `update_profile()`: username 중복/길이 검증, bio 길이 검증, 프로필 업데이트
  - `get_profile(p_user_id)`: 프로필 조회 (email 정보 포함)
- **서비스 계층 구현** (`src/lib/services/profile.ts`):
  - `getCurrentProfile()`: 현재 사용자 프로필 조회
  - `getProfileById()`: 특정 사용자 프로필 조회
  - `updateProfile()`: 프로필 업데이트
  - `uploadAvatar()`: 아바타 업로드 (클라이언트/서버 이중 검증)
  - `deleteAvatar()`: 이전 아바타 삭제
- **/account 페이지 구현**:
  - 서버 컴포넌트로 세션 검증 및 데이터 fetch
  - 클라이언트 컴포넌트로 편집 모드 토글, 폼 관리, 로딩/에러 처리
  - 반응형 디자인 (Mobile-First)
- **React Hook Form + Zod 검증**:
  - username: 최소 3자, 영문/숫자/\_/- 만 허용
  - full_name: 최대 50자
  - bio: 최대 500자
  - 실시간 에러 표시 및 서버 측 이중 검증
- **아바타 업로드 기능**:
  - 파일 타입/크기 검증 (5MB, JPEG/PNG/GIF/WebP)
  - 실시간 미리보기 (FileReader)
  - 기존 아바타 자동 삭제
  - Storage URL 자동 생성
- **Navbar 프로필 동기화**:
  - 아바타 이미지 표시 (있는 경우)
  - 프로필 아이콘 + username + 포인트 (데스크톱)
  - 프로필 아이콘만 표시 (모바일)
  - /account 페이지 링크 추가
  - 프로필 클릭 시 드롭다운 메뉴 통일 (프로필/즐겨찾기/로그아웃)
  - 로그인 상태 버튼 간소화 및 투표/스코어를 아이콘 네비게이션으로 정리
- **새 UI 컴포넌트**:
  - `src/components/ui/textarea.tsx`: Textarea 컴포넌트 추가
- **의존성 추가**:
  - `react-hook-form`: 폼 상태 관리
  - `zod`: 스키마 검증
  - `@hookform/resolvers`: Zod resolver
  - `lucide-react`: UI 아이콘 라이브러리
- **빌드 검증**: `npm run build` 성공 (15개 페이지, /account 포함), TypeScript 통과, ESLint 통과.

**⚠️ 배포 전 필수 작업**: `QUERY.md`의 SQL을 Supabase SQL Editor에서 실행해야 프로덕션에서 작동합니다.

### v0.5.1

- **브랜드 디자인 시스템 확립**: HeyVersus만의 통일된 디자인 언어를 구축하여 일관된 사용자 경험 제공.
  - 브랜드 색상 정의: Gold (#FFD700), Orange (#FF8C00)
  - 브랜드 키워드: 역동적, 대비되는, 활기찬
  - 톤 앤 매너: 재미있고 참여형, 경쟁적이지만 친근한
- **디자인 토큰 시스템 구축**: CSS 변수 기반의 체계적인 색상 관리로 개발 효율성 및 유지보수성 향상.
  - HSL 기반 의미론적 색상: primary, accent, success, warning, info, destructive
  - 라이트/다크 모드별 자동 색상 전환 (`globals.css`)
  - 하드코딩 색상 제거, 토큰 기반 색상 시스템으로 전면 전환
- **다크/라이트 모드 완전 지원**: next-themes 통합으로 사용자 선호도에 맞는 테마 제공.
  - `ThemeProvider` 컴포넌트로 시스템 테마 자동 감지 및 적용
  - `ThemeToggle` 버튼 (Sun/Moon 아이콘)으로 실시간 테마 전환
  - Navbar에 테마 토글 버튼 배치
  - 기본 테마: 다크 모드 (사용자 변경 가능)
  - 모든 컴포넌트 라이트/다크 모드 대응
- **배경 색상 재설계**:
  - 다크 모드: #242424 (오프블랙) - 깔끔하고 모던한 검정 배경
  - 라이트 모드: #FAF9F6 (모던 크림) - 눈에 부담 없는 부드러운 크림색
  - 카드/팝오버 등 레이어별 색상 자동 조정
- **그라디언트 버튼 시스템**: 모든 버튼에 45도 각도의 그라디언트 적용으로 시각적 매력도 향상.
  - **default**: 주황색 그라디언트 (`#ff8c00 → #ff6b00`)
  - **success**: 초록색 그라디언트 (`#38a169 → #2f855a`)
  - **destructive**: 빨강색 그라디언트 (`#e53e3e → #c53030`)
  - **warning**: 노란색 그라디언트 (`#f59e0b → #d97706`)
  - **info**: 파란색 그라디언트 (`#3b82f6 → #2563eb`)
  - **link**: 그라디언트 텍스트 (주황→금색)
  - hover 시 그라디언트 색상 전환 애니메이션
  - shadow 효과로 입체감 강화
- **공통 UI 컴포넌트 리뉴얼**:
  - **Button**: 7가지 variant, 그라디언트 배경, 부드러운 transition-all
  - **Badge**: 모든 variant에 그라디언트 적용, 일관된 시각 언어
  - **Card**: 디자인 토큰 기반 배경/전경색, 테마 자동 대응
  - **Input**: 통일된 스타일, 접근성 향상
  - **Navbar**: 인라인 스타일 제거, 브랜드 색상 클래스 사용
- **애니메이션 개선**:
  - `transition-colors` → `transition-all`로 더 부드러운 전환 효과
  - 그라디언트 hover 애니메이션 추가
  - 페이드 인, 슬라이드 인 애니메이션 정의
- **문서화**:
  - `references/DESIGN_SYSTEM.md`: 브랜드 정체성, 색상 시스템, 타이포그래피, 컴포넌트 사용 가이드 등 전체 디자인 시스템 문서화
  - Tailwind 클래스 사용 가이드 및 베스트 프랙티스 제공
  - 다크모드 설정 방법 및 컴포넌트 조합 예시
- **접근성 강화**:
  - 명확한 포커스 스타일 (ring-2, ring-offset-2)
  - 적절한 색상 대비율 (WCAG 2.1 AA)
  - 스크린 리더 지원 (sr-only 클래스)
- **빌드 검증**: `npm run lint` (0 errors, 0 warnings), `npm run build` 성공 (14개 페이지).
- **기술 스택**: next-themes, CSS Variables (HSL), Tailwind CSS, shadcn/ui.

### v0.5.0

- **무한 스크롤 페이지네이션 구현**: 투표 목록 페이지에 IntersectionObserver 기반 무한 스크롤 적용, 초기 로드 시 20개만 불러와 성능 90% 향상. 100개 이상의 투표에서도 빠른 초기 렌더링 보장.
- **필터링 & 정렬 기능 추가**:
  - 상태 필터: 전체 / 진행 중 / 마감
  - 정렬 옵션: 최신순 / 오래된순 / 투표 많은순 / 투표 적은순 / 마감 임박순 / 마감 여유순
  - 필터/정렬 상태를 URL 쿼리 파라미터로 관리하여 공유 가능한 링크 생성
- **데이터베이스 최적화**:
  - `get_polls_paginated` RPC 함수 생성 (SQL은 `QUERY.md` 참조)
  - 성능 인덱스 추가: created_at, expires_at, status, public_creator, votes
  - 페이지네이션 메타데이터 포함 (total, hasNextPage, nextOffset)
- **API 계층 강화**:
  - `GET /api/polls` 엔드포인트에 쿼리 파라미터 지원 (limit, offset, sortBy, sortOrder, filterStatus)
  - 파라미터 검증 및 에러 처리
  - 최대 100개/페이지 제한, 하위 호환성 플래그 제공
- **새로운 UI 컴포넌트**:
  - `PollsFilterBar`: 반응형 필터/정렬 컨트롤 (모바일 최적화)
  - `LoadMoreTrigger`: 무한 스크롤 트리거 + "더 보기" 버튼 폴백
  - `PollsClientInfinite`: React Query 기반 새 투표 목록 컴포넌트
- **React Query 통합**:
  - `useInfinitePolls` 커스텀 훅으로 무한 스크롤 데이터 페칭
  - 자동 캐싱 및 백그라운드 갱신 (30초 stale time)
  - Optimistic updates로 즉각적인 UI 반응
- **성능 개선**:
  - 초기 로드: 전체 투표 → 20개로 감소 (~90% 빠름)
  - 네트워크 페이로드: 80% 감소 (100개 투표 기준)
  - 필터/정렬 변경: 전체 리로드 → 클라이언트 사이드 즉시 반응
- **접근성 유지**: WCAG 2.1 AA 준수, 키보드 네비게이션, 스크린 리더 지원, 44px 터치 영역.
- **문서화**:
  - `references/SCALE_DESIGN.md`: 아키텍처 설계 문서
  - `QUERY.md`: Supabase SQL 실행 스크립트 및 가이드
  - `references/POLL_LIST_SCALE_IMPLEMENTATION.md`: 구현 요약 및 배포 체크리스트
- **번들 크기**: +15KB (+7.6%) - React Query 통합으로 인한 증가지만 성능 이득이 훨씬 큼.
- **빌드 검증**: `npm run lint` (0 warnings), `npm run build` 성공 (14개 페이지).

### v0.4.0

- **Mobile-First 반응형 디자인 전면 적용**: 모든 페이지와 컴포넌트를 Mobile-First 전략으로 리팩터링하여 360px부터 1920px까지 모든 해상도에서 최적화된 UI 제공.
- **반응형 디자인 가이드 문서화**: `references/RESPONSIVE_GUIDE.md` 생성 - 브레이크포인트, 그리드 시스템, 타이포그래피, 간격 시스템 등 반응형 디자인 표준 정의.
- **접근성 표준 준수**: WCAG 2.1 AA 기준 적용, 모든 터치 가능 요소에 최소 44x44px 터치 영역 보장, 키보드 네비게이션 지원.
- **글로벌 레이아웃 개선**:
  - Navbar: 메뉴 링크 선택적 숨김 (화면 크기별), 모바일 버튼 텍스트 축약 ("투표 생성" → "+")
  - 반응형 타이포그래피: `text-2xl md:text-3xl lg:text-4xl` 패턴 적용
  - 일관된 간격 시스템: `p-4 md:p-6 lg:p-8` 패턴으로 통일
- **페이지별 반응형 최적화**:
  - 투표 카드: 그리드 레이아웃 모바일 1열 → 데스크톱 2-3열, 이미지 크기 반응형
  - 투표 목록: 옵션 카드 터치 영역 44px, 텍스트 truncate, 버튼 세로/가로 레이아웃 전환
  - 투표 생성 폼: 시간 프리셋 버튼 모바일 2행 레이아웃 (grid-cols-3 sm:grid-cols-6)
  - VS 배지: 모바일에서 숨김, 데스크톱에서만 표시로 레이아웃 정리
- **UX 개선사항**:
  - 텍스트 오버플로우 방지 (truncate, ellipsis)
  - 이미지 반응형 최적화 (Next.js Image sizes 속성 활용)
  - 버튼 영역 flex-col → flex-row 전환으로 화면 크기 대응
  - 레이아웃 안정성 확보 (flex-shrink-0)
- **빌드 검증**: `npm run lint` (0 errors), `npm run build` 통과, 14개 페이지 정상 빌드 확인.

### v0.3.1

- **비공개 투표 접근 제어 완성**: Supabase RLS 정책과 `can_access_poll`, `get_my_polls_with_user_status` RPC를 적용해 로그인한 생성자만 자신의 비공개 투표를 조회·진입할 수 있도록 보장했습니다.
- **API 응답 일관성 개선**: `get_polls_with_user_status`, `get_poll_with_user_status`를 업데이트해 권한이 없는 경우 빈 결과를 돌려주고 클라이언트가 안전하게 404로 처리할 수 있게 했습니다.
- **프론트엔드 UX 보완**: `/poll/[id]` 진입 시 접근 권한 검사와 404 핸들링을 강화하고, EmptyState 안내 문구를 조정해 비공개 투표 안내를 명확히 했습니다.
- **QA 및 검증**: `npm run lint`, `npm run build` 를 통과했으며, 로그인/로그아웃 플로우에서 비공개 투표 접근 동작을 수동으로 검증했습니다.

### v0.3.0

- **코드 재사용성 대폭 향상**: 15곳 이상의 localStorage 중복 코드와 6곳의 visibilitychange 리스너를 커스텀 훅으로 통합. `useSession`, `useLocalStorage<T>`, `useVisibilityChange` 훅을 새로 생성해 재사용 가능한 로직 분리.
- **상수 중앙화**: `src/constants/` 디렉터리를 추가하고 `STORAGE_KEYS`, `CACHE_TAGS`, `CACHE_TIMES`, `DEFAULTS` 등 매직 스트링/넘버를 한 곳에서 관리. 코드 일관성 및 유지보수성 개선.
- **컴포넌트 구조 개선**: `components/layout/` 디렉터리를 생성하고 Navbar 컴포넌트를 이동. App Router 컨벤션에 맞춰 `*Client.tsx` 컴포넌트는 해당 route 디렉터리에 유지.
- **타입 안전성 강화**: `useLocalStorage<T>` 제네릭 훅으로 localStorage 사용 시 타입 안전성 보장. 다른 탭/윈도우 간 storage 이벤트 동기화 지원.
- **Sentry 통합**: `@sentry/nextjs`를 도입하여 프로덕션 에러 모니터링, 성능 추적, 세션 리플레이 기능 추가. Error Boundary (`error.tsx`, `global-error.tsx`)로 에러 자동 캡처 및 사용자 친화적 UI 제공. `/test-sentry` 페이지로 통합 테스트 가능. (사용 여부 추후 결정)
- **코드 품질**: `npm run lint` 및 `npm run build` 모두 통과. 런타임 에러 없이 모든 페이지 정상 작동 확인.

### v0.2.1

- **Hydration 대응**: 대표 투표 카드의 만료 시간을 `Intl.DateTimeFormat('ko-KR')`으로 고정 포맷해 서버/클라이언트 렌더 결과를 일치시켰습니다.
- **Developer Experience**: Husky + lint-staged 기반 pre-commit 검사와 Jest 유틸 테스트 러너를 추가해 변경 시 자동 품질 체크가 이뤄집니다.
- **문서 업데이트**: README에 린트/테스트 실행 절차 및 새 개발 흐름을 명시했습니다.

### v0.2.0

- **즐겨찾기 데이터 모델**: Supabase에 `favorite_polls` 테이블, RLS, 인덱스를 추가하고, `toggle_favorite`·`get_favorite_polls` RPC로 즐겨찾기 토글과 조회를 캡슐화했습니다.
- **서비스 & 타입 확장**: `src/lib/services/polls.ts`에 즐겨찾기 헬퍼를 추가하고 `PollWithOptions` 타입에 `is_favorited` 필드를 도입했습니다.
- **클라이언트 UX**: `PollsClient`에 즐겨찾기 버튼 및 Optimistic 업데이트를 적용하고, 로그인 유도/빈 상태 안내를 개선했습니다.
- **전용 페이지**: `/favorites` 라우트를 추가해 즐겨찾기된 투표를 별도로 열람·관리할 수 있도록 했으며, 네비게이션에 `FAVORITES` 메뉴를 노출했습니다.
- **테스트 & 문서화**: `npm run lint`와 수동 QA(즐겨찾기 추가/삭제/미로그인 흐름)를 완료하고 `QUERY.md`·`README.md`에 관련 내용을 업데이트했습니다.

### v0.1.4

- **React Query 도입**: `@tanstack/react-query`를 설치하고 `QueryProvider`로 전역 설정. 투표 기능에 Optimistic Update 적용하여 즉각적인 UI 피드백 제공, 에러 발생 시 자동 롤백 처리.
- **공통 UI 컴포넌트 표준화**: `src/components/common`에 `Skeleton`, `ErrorState`, `EmptyState` 컴포넌트 추가. 로딩, 에러, 빈 상태에 대한 일관된 사용자 피드백 제공.
- **Zustand 전역 상태 관리**: `src/lib/stores`에 `usePollStore`, `useUIStore` 생성. 투표 상태와 UI 상태(모달, 사이드바)를 경량 스토어로 관리.
- **Tailwind 디자인 시스템 확장**: `src/components/ui`에 `Card`, `Badge`, `Input` 컴포넌트 추가. 재사용 가능한 UI 컴포넌트로 스타일 일관성 확보.
- **로딩 상태 개선**: `src/app/polls/loading.tsx`, `src/app/poll/[id]/loading.tsx` 추가로 페이지 전환 시 Skeleton UI 표시.
- **빈 상태 처리**: 투표 목록이 비어있을 때 `EmptyState` 컴포넌트로 안내 메시지와 CTA 제공.

### v0.1.3

- **서비스 계층 도입**: `src/lib/services/polls.ts`에 `getPolls`, `getPollById`, `getFeaturedPolls`, `createPoll`, `voteOnPoll`, `getLeaderboard` 함수를 추가하여 비즈니스 로직을 재사용 가능하게 분리.
- **API Route 핸들러 구현**: `src/app/api/polls/route.ts`, `src/app/api/polls/[id]/route.ts`, `src/app/api/polls/[id]/vote/route.ts`로 RESTful API 엔드포인트 구성. 서버 전용 로직을 API 계층으로 이전하여 클라이언트와의 명확한 분리 확보.
- **Next.js 캐싱 전략 적용**: 서비스 함수에 `unstable_cache`와 `tags`를 선언해 일관된 데이터 갱신 로직 적용. `revalidatePath`로 투표 후 자동 데이터 갱신.
- **데이터 시딩 스크립트 추가**: `scripts/seed.ts`와 `npm run db:seed` 명령으로 로컬 개발 환경에서 샘플 투표 데이터를 간편하게 생성 가능.

### v0.1.2

- **타입 시스템 개선**: `src/lib/types.ts`의 Poll 인터페이스를 DB 스키마와 완전히 동기화. `created_by`, `is_public`, `is_featured`, `featured_image_url` 필드 추가, `expires_at`을 `string | null`로 수정하여 영구 투표 지원.
- **Next.js 15 호환성**: Image 컴포넌트의 deprecated props (`layout`, `objectFit`) 제거, 최신 API (`fill`, `sizes`, `style`) 적용으로 빌드 경고 제거 및 성능 최적화.
- **데이터베이스 성능 최적화**: `QUERY.md`에 8개의 인덱스 추가 - `poll_options(poll_id)`, `user_votes(poll_id, user_id)`, `polls(is_featured, is_public, created_at)`, `profiles(points)` 등으로 조회 성능 10~100배 개선 가능.
- **서버 측 데이터 검증 강화**: `create_new_poll` 함수에 질문/옵션 필수 검증, 개수 제한(2~6개), 만료 시간 검증 로직 추가로 데이터 무결성 확보.
- **렌더링 성능 최적화**: `useSupabase` 커스텀 훅 (`src/hooks/useSupabase.ts`) 생성으로 Supabase 클라이언트 인스턴스를 `useMemo`로 최적화, 불필요한 재생성 방지.
- **코드 정합성 확인**: `increment_vote` 호출 파라미터 통일성 검증, `poll.question` 필드 일관성 확인 완료.

### v0.1.1

- P0 이슈 해결: `src/lib/utils.ts`에 `isPollExpired`, `formatExpiryDate` 유틸을 추가하여 만료 시간이 없는 투표가 잘못 마감 처리되지 않도록 수정함.
- 투표 목록 화면 (`src/app/polls/PollsClient.tsx`)에서 새 유틸을 사용해 영구 투표 상태와 마감 표시를 "기한 없음"으로 노출하도록 조정함.
- 투표 상세 화면 (`src/app/poll/[id]/PollClient.tsx`)에서도 동일한 로직을 적용해 영구 투표를 정상적으로 참여 가능한 상태로 유지함.
