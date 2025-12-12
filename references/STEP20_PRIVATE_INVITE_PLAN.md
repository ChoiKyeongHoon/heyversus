# Step 20 – 비공개 투표 초대 + 선착순 인원 제한 계획

## 목표 & 성공 기준
- 비공개 투표(`is_public = false`)는 **생성자 또는 초대된 사용자만** 조회·투표할 수 있다.
- 초대 링크를 통한 접근/참여 흐름이 끊기지 않고, 권한 실패/만료/마감 상태가 명확히 안내된다.
- 비공개 투표에서 **선착순 N명(`max_voters`) 참여 제한**이 서버에서 원자적으로 보장되며, `max_voters` 미설정(NULL) 시 제한 없이 진행된다.
- 비공개 투표는 생성 시 `expires_at`(마감 캡)이 **필수**이고, 이후 어떤 마감도 이 캡을 초과해 설정할 수 없다.
- 인원 제한 도달 시 **정원 마감(limit)**으로 자동 종료되며, 초대자/생성자는 **결과·상세 읽기 권한을 유지**한다.
- 정원 마감(limit)은 생성자가 `max_voters`를 상향하거나 NULL로 해제하면 **자동으로 다시 투표 가능**해진다(UX: “정원 늘리기/제한 해제”, 별도 재오픈 버튼 없음).
- 수동 마감/예약 마감/시간 만료 마감은 **비가역적 최종 마감**으로 다시 열 수 없다.

## 범위
- 비공개 투표 전용 기능:
  - 초대 기반 접근 제어
  - 선착순 참여자 수 제한(`max_voters`)
  - 수동 마감
  - 예약 마감(`scheduled_close_at`)
  - 정원 늘리기/제한 해제(`max_voters` 상향/NULL)
- 공개 투표(`is_public = true`)에는 인원 제한 기능을 적용하지 않는다.
- 비공개 투표는 `expires_at`이 **필수**이며, 무기한(캡 없는) 비공개 투표는 후속 범위로 둔다.
- 초대 대상은 기본적으로 **앱 사용자(user_id) 기반**으로 설계하며, 이메일 초대는 오픈 이슈로 남긴다.

## 기능 정의
### 1) 비공개 투표 초대
- 생성자는 투표 상세(`/poll/[id]`)에서 초대 패널을 통해 사용자 검색/다중 선택으로 초대를 생성한다.
- 초대 대상은 링크로 접근하거나, 이미 로그인 상태에서 자동 권한 부여를 받아 투표에 참여한다.
- 생성자는 초대를 철회할 수 있으며, 철회된 초대는 더 이상 접근 권한을 제공하지 않는다.

### 2) 선착순 참여 제한(`max_voters`)
- 비공개 투표 생성 시 선택적으로 `max_voters`를 설정할 수 있다.
- 서버는 **고유 투표자 수(`user_votes.user_id` DISTINCT)**를 기준으로 제한을 강제한다.
- N번째 투표가 성공하는 순간 자동으로 투표를 마감한다(`closed_reason = 'limit'`).
- 제한 도달 후에는 추가 투표 시도가 409/422로 거절된다.
- 정원 마감(limit) 상태는 생성자가 `max_voters`를 **상향**하거나 **NULL로 해제**하면 자동으로 해제되어 다시 투표가 가능해진다(“재오픈” 용어 사용 금지).

### 3) 수동/예약 마감
- 생성자는 언제든 **즉시 수동 마감**할 수 있다(`closed_reason = 'manual'`, 비가역).
- 생성자는 투표가 충분히 모였다고 판단될 때 **예약 마감 시각**을 설정할 수 있다.
  - 예약은 `scheduled_close_at`에 저장되며, **`scheduled_close_at <= expires_at`(마감 캡)만 허용**된다.
  - 예약 마감은 **1회 설정 후 수정/취소/연장 불가**(비가역). 다만 예약 이후에도 즉시 수동 마감으로 더 빨리 닫을 수 있다.
  - 예약 시각에 도달하면 자동 종료로 취급하며(표시/사유: `closed_reason = 'scheduled'`), 이후 다시 열 수 없다.

## 설계 안 (백엔드)
### DB 스키마
1. `polls` 컬럼 추가
- `max_voters INT NULL` : 비공개에서만 사용, NULL이면 제한 없음
- `closed_at TIMESTAMPTZ NULL`
- `scheduled_close_at TIMESTAMPTZ NULL` : 예약 마감 시각(캡 내 1회 설정)
- `closed_reason TEXT NULL` : `'limit' | 'manual' | 'scheduled'`

2. `poll_invites` 테이블 신설
- `id UUID PK`
- `poll_id UUID FK polls(id) ON DELETE CASCADE`
- `inviter_id UUID` (poll 생성자)
- `target_user_id UUID NULL`
- `created_at TIMESTAMPTZ DEFAULT now()`
- `revoked_at TIMESTAMPTZ NULL`
- (선택) `token TEXT UNIQUE` : 초대 링크 토큰을 쓰는 경우에만

3. 인덱스
- `poll_invites(poll_id)`
- `poll_invites(target_user_id)`

### RLS 정책
- **polls/poll_options SELECT**:
  - 공개 투표는 기존 정책 유지.
  - 비공개는 `auth.uid() = polls.user_id OR EXISTS(valid invite)` 조건으로 허용.
- **user_votes INSERT**:
  - 비공개 투표에 대해 위 SELECT 조건을 만족하고,
  - `closed_at IS NULL`
  - `scheduled_close_at IS NULL OR now() < scheduled_close_at`
  - `now() < expires_at`(비공개는 expires_at 필수)일 때만 허용.
  - `max_voters` 상한은 RPC에서 최종 강제(동시성 안전).
- **poll_invites**:
  - 생성자만 SELECT/INSERT/UPDATE(revoke) 가능.

### RPC
1. 초대 관리
- `create_poll_invite(p_poll_id, p_target_user_id)`  
  - 중복 초대 방지, revoked 상태면 재생성 정책(옵션).
- `revoke_poll_invite(p_invite_id)`
- `get_poll_invitees(p_poll_id)`

2. 마감/재오픈
- `close_poll(p_poll_id)`  
  - `closed_at = now(), closed_reason = 'manual'`
- `schedule_close_poll(p_poll_id, p_close_at)`  
  - `scheduled_close_at` 1회 설정, `p_close_at <= expires_at` 강제.
  - 설정 후 변경/취소/연장 불가, 필요 시 `close_poll`로 즉시 마감만 허용.
- `update_max_voters(p_poll_id, p_new_max_voters NULLABLE)`  
  - 비공개 전용.
  - `p_new_max_voters`가 현재 고유 투표자 수보다 크거나 NULL일 때만 허용.
  - 정원 마감(limit) 상태에서 이 조건을 만족하면 `closed_at`/`closed_reason`을 해제해 자동으로 다시 투표 가능하게 한다.

3. 투표(기존 `increment_vote` 확장)
- `polls` 행을 `FOR UPDATE`로 잠금.
- 비공개 + `max_voters` 설정 시:
  - `COUNT(DISTINCT user_votes.user_id)`가 상한 이상이면 투표 거절 + `closed_reason='limit'`로 마감 유지.
  - 상한 미만이면 투표 진행.
  - N번째 성공 직후 상한 도달이면 `closed_at`/`closed_reason='limit'`로 자동 마감.

## 서비스/API 계층
- `src/lib/services/pollInvites.ts` + React Query 훅:
  - 초대 생성/목록/철회 캡슐화.
- `src/lib/services/polls.ts` 응답 보강:
  - `max_voters`, `closed_at`, `closed_reason`, `current_voters_count` 포함.
- API 라우트:
  - `/api/polls/[id]/invites` (GET/POST/DELETE)
  - `/api/polls/[id]/close` (POST) : 즉시 수동 마감
  - `/api/polls/[id]/schedule-close` (POST) : 예약 마감(1회, 캡 내)
  - `/api/polls/[id]/max-voters` (POST/PATCH) : 정원 늘리기/제한 해제
  - 입력은 Zod로 검증 후 RPC 호출, 에러는 401/403/409/422로 매핑.

## 클라이언트 UI/UX
- `/create-poll`:
  - 비공개 선택 시 `max_voters` 입력(옵션) 노출.
  - 비공개 투표는 `expires_at`(마감 캡) 입력을 필수로 강제.
- `/poll/[id]`:
  - “현재 X / 최대 N” 표시.
  - `closed_reason`에 따른 마감 배너 + 투표 버튼 비활성화.
  - 생성자에게 초대 패널 + **즉시 마감/예약 마감/정원 늘리기(제한 해제)** UI 제공.
    - 예약 마감은 한 번 설정하면 취소/연장 UI를 노출하지 않고, 필요 시 “지금 마감”만 가능.
    - 정원 마감(limit) 상태에서는 “정원 늘리기/제한 해제”로만 다시 투표 가능.

## QA/테스트 시나리오
- 비공개 투표 권한:
  - 생성자/초대자만 조회·투표 가능, 비초대자는 403.
- 선착순 제한:
  - N번째 투표 성공 후 자동 마감.
  - (N+1)번째 투표는 서버에서 거절.
- 재오픈:
  - 정원 마감(limit) 상태에서 상한 상향/해제 전에는 투표 불가 유지.
  - 상한 상향/해제 후 자동으로 다시 투표 가능.
- 예약 마감:
  - `scheduled_close_at`이 `expires_at`을 초과하면 서버에서 거절.
  - 예약 설정 후 취소/연장 시도는 서버에서 거절.
  - 예약 시각 도달 후 투표가 거절되고 마감 배너가 표시됨.
- 마감 상태 UX:
  - 마감 후에도 초대자/생성자는 결과/상세 읽기 가능.

## 오픈 이슈/결정 필요
- 이메일 초대(`target_email` + `token`)를 Step 20 범위에 포함할지 여부.
- 초대 토큰을 “링크 파라미터 기반”으로 쓸지, “초대 목록 기반 자동 권한”만으로 갈지 결정.
