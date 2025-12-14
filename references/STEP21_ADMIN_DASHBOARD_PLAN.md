# Step 21 – 관리자 운영 대시보드 계획

## 목표 & 성공 기준
- `/admin`은 **관리자만 접근 가능한 보호 라우트**로 동작한다.
- 관리자는 신고된 투표/사용자를 검토·처리하고(모더레이션), 주요 운영 지표를 한눈에 파악할 수 있다.
- 모든 관리자 액션은 **감사 로그(admin_audit_logs)**로 기록되어 추적 가능하다.
- 지표/카드/액션/신고 사유 등은 **후속 스텝에서 쉽게 추가·제거·확장**할 수 있는 구조로 설계된다.

## 범위 (MVP → 확장)
### MVP 범위
- 관리자 권한 모델(프로필 role 기반) + `/admin` 보호 라우트.
- 신고(Report) 테이블/플로우 + 관리자 처리 UI.
- 운영 지표 대시보드(확장 가능한 JSONB stats RPC 기반).
- 관리자 액션(투표 비공개/삭제/대표 지정 등) + 감사 로그.

### 확장 범위(후속)
- 세분화된 역할(`moderator`, `editor` 등) 및 리소스 단위 권한.
- 고급 지표(리텐션/코호트/전환율/퍼널), 차트/다운로드.
- 자동화된 알림/이메일 워크플로, 레이트 리밋/안티어뷰징 정책.

## 기능 정의
### 1) 관리자 권한 모델(A안)
- `profiles.role` 컬럼으로 역할을 관리한다.
  - 기본값 `user`, 관리자 `admin`.
- 일반 사용자는 **role을 읽을 수는 있어도 변경할 수 없다.**
- 관리자 role 부여/회수는 서비스 롤 또는 관리자 전용 RPC로만 수행한다.

### 2) /admin 보호 라우트
- `src/app/admin` 세그먼트를 생성하고 서버 레이아웃에서 세션 + `profiles.role`을 확인한다.
- role이 `admin`이 아니면 403 또는 메인으로 리다이렉트한다.
- API 라우트/서버 액션도 동일한 `requireAdmin()` 가드를 재사용한다.

### 2-1) 접속 방법 & 권한 부여(부트스트랩)
- 접속 URL
  - 로컬 개발: `npm run dev` 실행 후 `http://localhost:3000/admin`
  - 배포: `https://heyversus.vercel.app/admin`
- 접근 조건
  - 로그인 상태여야 하며, `public.profiles.role = 'admin'` 이어야 접근 가능
- 선행 작업(필수)
  - Supabase SQL Editor에서 `references/QUERY.md`를 **전체 실행** (권장)
    - 관리자 기능(Section 12) + 대표 투표 단일화(대표 지정 RPC/인덱스)까지 함께 적용됩니다.
- 관리자 role 부여(가장 단순/안전)
  - Supabase Dashboard → Authentication → Users에서 내 `id(UUID)` 확인 후 아래 실행:
    - `UPDATE public.profiles SET role = 'admin' WHERE id = '내-UUID-여기에-붙여넣기';`
    - ⚠️ 주의: 예시의 `< >`는 플레이스홀더입니다. 실제 실행할 때는 UUID만 남기고 `< >`는 제거하세요.
- 관리자 role 회수(권한 삭제)
  - `UPDATE public.profiles SET role = 'user' WHERE id = '내-UUID-여기에-붙여넣기';`
- 접속이 안 될 때 체크
  - `/admin`이 `/`로 리다이렉트: role이 admin이 아님
  - “DB 스키마가 최신이 아님/role 컬럼 없음” 류 오류: Step 21 SQL 미적용(특히 `profiles.role`)

### 3) 신고(Report) 플로우
- 신고 대상: **투표(poll) + 사용자(user) 모두 지원**.
- 신고 사유: **고정 코드(enum/check) + 자유 서술** 하이브리드.
- 신고는 **로그인 사용자만** 가능하며, 생성자/관리자에게 악용 리스크를 줄인다.
- 관리자는 신고를 검토 후 상태를 변경하고 메모를 남긴다.

### 4) 운영 지표 대시보드(확장 가능)
- 지표는 고정 스키마가 아니라 `get_admin_stats(range)`가 **JSONB(map)로 반환**한다.
- `/admin` UI는 “카드 설정 리스트”를 기준으로 JSONB를 렌더링하므로,
  - 지표 추가/삭제는 RPC 쿼리 + 설정만 변경하면 된다.
- 초기 MVP 지표는 프로필 필드 변화에 의존하지 않는 것들로 시작한다.

### 5) 관리자 액션 & 감사 로그
- 관리자는 투표에 대해 비공개 전환/삭제/대표 지정 등의 액션을 실행할 수 있다.
- 모든 액션은 서버에서 권한을 다시 확인하고, **admin_audit_logs에 payload 포함으로 기록**한다.

### 5-1) 대표 투표 운영 규칙(구현 반영)
- 대표 투표(`polls.is_featured = true`)는 **동시에 1개만 허용**된다. (DB 제약 + RPC 로직)
- 대표 투표 지정 시 기존 대표 투표는 **자동 해제**된다.
- 대표 투표로 지정하려면 **모든 선택지(투표 대상)에 이미지(`poll_options.image_url`)가 있어야** 한다.
- 홈/카드에서 사용하는 대표 투표 이미지는 `polls.featured_image_url`이 아니라 **선택지 이미지(`poll_options.image_url`)**를 기준으로 노출한다.

## 설계 안 (백엔드)
### DB 스키마
1) `profiles` 확장
- `role TEXT NOT NULL DEFAULT 'user'`
- 허용 값: `'user' | 'admin'` (후속 확장 가능)

2) `reports` 테이블 신설
- `id UUID PK`
- `target_type TEXT NOT NULL` : `'poll' | 'user'`
- `poll_id UUID NULL`
- `target_user_id UUID NULL`
- `reason_code TEXT NOT NULL`
- `reason_detail TEXT NULL`
- `status TEXT NOT NULL DEFAULT 'open'`
- `reporter_user_id UUID NOT NULL`
- `created_at TIMESTAMPTZ DEFAULT now()`
- `resolved_by UUID NULL`
- `resolved_at TIMESTAMPTZ NULL`
- `admin_note TEXT NULL`
- 체크 제약:
  - `target_type='poll'`이면 `poll_id`만 채워지고 `target_user_id`는 NULL
  - `target_type='user'`이면 `target_user_id`만 채워지고 `poll_id`는 NULL

3) `admin_audit_logs` 테이블 신설
- `id UUID PK`
- `actor_user_id UUID NOT NULL`
- `action TEXT NOT NULL`
- `target_type TEXT NOT NULL`
- `target_id UUID NOT NULL`
- `payload JSONB NULL`
- `created_at TIMESTAMPTZ DEFAULT now()`

4) 인덱스(예정)
- `reports(status, created_at)`
- `reports(poll_id)` / `reports(target_user_id)`
- `admin_audit_logs(created_at, actor_user_id)`
- 대표 투표 단일화: `polls`의 `is_featured=true`를 **부분 유니크 인덱스**로 1개만 허용

### RLS 정책
1) `profiles`
- role 컬럼 업데이트는 **서비스 롤/관리자 전용 RPC만 가능**하도록 차단.
- 일반 사용자는 자기 프로필 SELECT/UPDATE(기존 정책 유지), role 수정 불가.

2) `reports`
- INSERT: 로그인 사용자(`auth.uid()` 존재)만, `reporter_user_id = auth.uid()` 강제.
- SELECT:
  - 일반 사용자: 자기 신고만 조회(선택).
  - admin: 전체 조회.
- UPDATE/DELETE:
  - 일반 사용자 불가.
  - admin만 상태 변경/해결 처리 가능.

3) `admin_audit_logs`
- SELECT/INSERT 모두 admin만 허용(INSERT는 RPC 내부에서만 발생).

### RPC/서비스
1) 권한
- `set_profile_role(p_user_id, p_role)` SECURITY DEFINER
  - 관리자만 호출 가능하거나, 운영 SQL로만 사용.

2) 신고
- `create_report(p_target_type, p_poll_id, p_target_user_id, p_reason_code, p_reason_detail)`
  - 체크 제약 및 사유 코드 검증.
- `get_reports_admin(p_status, p_limit, p_offset)`
- `resolve_report(p_report_id, p_status, p_admin_note)`
  - 상태 전환 + 감사 로그 기록.

3) 지표
- `get_admin_stats(p_range TEXT)` → JSONB 반환
  - 예: `{ polls_created: 123, votes_cast: 456, favorites_added: 78, active_users: 34, open_reports: 5 }`
  - 지표 키/구성은 후속에서 자유롭게 변경 가능.

4) 관리자 액션
- `admin_set_poll_visibility(p_poll_id, p_is_public)`
- `admin_delete_poll(p_poll_id)`
- `admin_set_featured(p_poll_id, p_is_featured)`
- 각 RPC는 admin 권한 확인 후 수행하고 audit log 기록.

## API 계층
- `/api/admin/stats` (GET)
- `/api/admin/reports` (GET/POST)
- `/api/admin/reports/[id]` (PATCH)
- `/api/admin/polls` (GET) — 투표 목록 검색/필터/페이지네이션
- `/api/admin/polls/[id]/visibility` (PATCH)
- `/api/admin/polls/[id]/feature` (PATCH)
- `/api/admin/polls/[id]` (DELETE)
- `/api/admin/poll-options/[id]/image` (PATCH) — 선택지 이미지(업로드/외부 URL) 설정/수정
- 모든 라우트는 `requireAdmin()` 가드 + Zod 검증 후 RPC 호출.

## 클라이언트 UI/UX
- `/admin` 레이아웃:
  - role 확인 후 admin만 렌더.
- 홈 대시보드:
  - JSONB stats 키를 카드 설정으로 매핑해 렌더(지표 확장 용이).
  - 기간 필터(예: 24h/7d/30d).
- 신고 관리:
  - 리스트(상태/사유/대상/신고자/일시) + 필터
  - 상세 뷰에서 상태 변경/메모 입력
  - 처리 시 토스트 + 리스트 자동 갱신.
- 투표/사용자 관리:
  - 검색/필터 + 액션 버튼(비공개 전환/삭제/대표 지정 등)
  - 액션 시 확인 모달 + 감사 로그 기록 안내.

## QA/테스트 시나리오
- 접근 제어:
  - 비관리자는 `/admin` 및 `/api/admin/*` 접근 시 403.
  - admin은 정상 접근/조회/액션 가능.
- 신고 플로우:
  - 로그인 사용자만 신고 가능.
  - 대상 타입에 따른 컬럼 체크가 올바르게 동작.
  - admin이 상태 변경하면 `resolved_by/at` 및 audit log가 생성됨.
- 지표:
  - `get_admin_stats` 기본 키가 정상 반환되고 UI에 렌더됨.
- 관리자 액션:
  - 액션 수행 시 데이터가 반영되고 audit log가 남는지 확인.

## 고정 신고 사유 코드(초안)
- `spam` / `hate` / `sexual` / `violence` / `harassment` / `misinfo` / `other`
- 사유 코드는 후속 스텝에서 enum/check만 확장하면 된다.

## 오픈 이슈/결정 필요
- 신고 대상에 “댓글/옵션” 등 추가 여부(후속).
- admin UI 탭 구성/필터/검색 UX 세부 확정.
- 관리자 role 부여 운영 프로세스(운영 SQL vs admin 전용 화면).
