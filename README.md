# Heyversus

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
- **사용자 경험(UX) 최적화**:
  - **신속한 피드백**: `sonner` 라이브러리를 활용하여 직관적인 Toast 알림을 제공합니다.
  - **자동 리디렉션**: 로그인 후 이전에 보던 페이지로 자동 이동하여 사용 흐름이 끊기지 않도록 합니다.
  - **데이터 자동 갱신**: 페이지에 다시 방문했을 때 최신 투표 데이터를 자동으로 불러와 보여줍니다.

## 🛠️ 기술 스택

- **프레임워크**: Next.js (App Router)
- **언어**: TypeScript
- **스타일링**: Tailwind CSS
- **백엔드 (BaaS)**: Supabase (Auth, PostgreSQL, Storage, Edge Functions)
- **UI 컴포넌트**: shadcn/ui
- **상태 관리**: React Context (Session Provider)
- **폰트 최적화**: `next/font`
- **알림**: Sonner (Toast notifications)
- **배포**: Vercel

## 📁 프로젝트 구조

```
/
├── public/              # 정적 에셋 (이미지, 폰트 등)
├── src/
│   ├── app/             # Next.js App Router 페이지 및 레이아웃
│   │   ├── page.tsx     # 메인 랜딩 페이지 (대표 투표)
│   │   ├── signin/      # 로그인 페이지
│   │   ├── signup/      # 회원가입 페이지
│   │   ├── create-poll/ # 투표 생성 페이지
│   │   ├── polls/       # 전체 투표 목록 페이지
│   │   ├── poll/[id]/   # 투표 상세 및 결과 페이지
│   │   └── score/       # 사용자 랭킹(스코어보드) 페이지
│   ├── components/      # 재사용 가능한 UI 컴포넌트
│   ├── lib/             # 공통 유틸리티 및 Supabase 클라이언트
│   └── middleware.ts    # Supabase 세션 관리 미들웨어
├── QUERY.md             # 데이터베이스 스키마 (SQL)
└── README.md            # 프로젝트 문서
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

    user_votes {
        UUID id PK
        UUID user_id
        UUID poll_id
        UUID option_id
        timestamptz created_at
    }
```

## 📌 업데이트 기록

### v0.1.1
- P0 이슈 해결: `src/lib/utils.ts`에 `isPollExpired`, `formatExpiryDate` 유틸을 추가하여 만료 시간이 없는 투표가 잘못 마감 처리되지 않도록 수정함.
- 투표 목록 화면 (`src/app/polls/PollsClient.tsx`)에서 새 유틸을 사용해 영구 투표 상태와 마감 표시를 “기한 없음”으로 노출하도록 조정함.
- 투표 상세 화면 (`src/app/poll/[id]/PollClient.tsx`)에서도 동일한 로직을 적용해 영구 투표를 정상적으로 참여 가능한 상태로 유지함.
