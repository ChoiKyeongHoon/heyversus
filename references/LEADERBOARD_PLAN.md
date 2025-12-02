# Leaderboard & Scoring Plan (Step 18)

## Scope & Guardrails
- 목표: 점수 공식/랭킹을 재정의해 활동을 반영하고, `/score` UX를 확장한다. (현재 단계: 합산 기반 모델 유지)
- UI/UX: 기존 디자인 시스템 준수(브랜드 골드/오렌지, 토큰 기반 색상, 44px 터치, 라이트/다크 토큰, PollsHero/카드 톤 재사용). 새 배지/탭/모달도 shadcn 컴포넌트 스타일로 통일한다.
- 호환성: 기존 `profiles.points`는 유지·호환층 제공 → 신규 집계(`profile_scores`)를 우선 사용하되 단계적으로 전환한다.
- 성능/비용: 점수 계산은 배치 중심, 실시간 반영은 최소화(선택적). 인덱스·페이지네이션을 전제로 설계한다.

## Scoring Model (제안)
- 이벤트 소스/기본 가중치: 투표 참여 +3, 투표 생성 +10(일일 3회 상한 후 0점), 즐겨찾기 추가 +2, 공유 +2, 피드백/댓글(있다면) +1, 연속 방문 보너스 +1~+3(3/7일 스택), 첫 참여 보너스 +5.
- 중복/제한: 동일 투표/이벤트는 하루 1회만 가산, 동일 공유/즐겨찾기 중복 무효, 주간 총점 상한 예: 500점.
- 시간 가중치 제외: 점수는 누적 합산만 사용하며 시간 경과에 따른 추가 조정은 적용하지 않는다.
- 비정상 패턴 가드: 레이트 리밋은 점수 계산과 분리(IP/세션 레벨), 로그 기반 모니터링으로 급증 탐지.
- 적재 범위(현 상태): vote(상세 투표), favorite(토글), create_poll(API 생성). 공유/연속 방문 등 나머지 이벤트는 후속 연동 필요.

## Data Model
- `profile_scores` (PK: user_id): `score`(DECIMAL), `last_activity_at`, `raw_points_cache`(옵션), `weekly_cap_hit`(bool).
- `profile_score_events`: `id`, `user_id`, `event_type`, `weight`, `metadata`(poll_id 등), `occurred_at`; 복합 유니크(`user_id`, `event_type`, `poll_id`, `date_trunc('day', occurred_at)`)로 중복 방지.
- `leaderboard_view`/함수 결과: `user_id`, `score`, `rank`, `display_name`, `avatar_url` 등 최소 필드만 노출(민감 정보 제외).
- 인덱스: `profile_scores(score DESC)`, `profile_scores(last_activity_at)`, `profile_score_events(user_id)`, 위 복합 유니크 인덱스.

## RLS & Exposure
- `profile_scores`: SELECT 공개(랭킹용), INSERT/UPDATE/DELETE는 service_role만 허용(RPC/배치 전용).
- `profile_score_events`: INSERT/SELECT/UPDATE/DELETE 모두 service_role만 허용(서버/배치 전용).
- `leaderboard` 뷰/RPC는 `SECURITY DEFINER`로 최소 컬럼만 반환해 기존 프로필 RLS와 분리한다.

## RPC / Batch
- `refresh_profile_scores(p_limit, p_offset)`: 일일 배치 합산 전용, 주간 캡은 후속 확장 예정.
- 실행 경로: service role 클라이언트(`src/lib/supabase/service-role.ts`) 또는 배치 스크립트(`scripts/refreshScores.ts`, env: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, 옵션 `SCORE_REFRESH_LIMIT`/`SCORE_REFRESH_OFFSET`)로 호출. Supabase Scheduler/CI에서 주기 실행을 권장.
- `get_leaderboard(p_limit, p_offset, p_scope?)`: 랭킹 조회(전체/친구/지역 확장 여지), 점수·순위·프로필 요약만 반환.
- `upsert_score_event(p_user_id, p_event_type, p_poll_id, p_weight_override?)`: 중복/제한 검증 후 이벤트 적재(실시간 가산이 필요한 경우만 사용).

## Service & Client Integration
- 서비스 계층: `src/lib/services/profile.ts` 또는 `services/leaderboard.ts`에 랭킹 조회 함수 추가. React Query 키는 `CACHE_TAGS` 패턴을 따라 정의.
- 캐싱/정적화: `/score`는 `get_leaderboard` 결과를 React Query로 캐시, 배치 주기(예: 5~15분)와 맞춘 `revalidate`/`invalidateQueries` 규칙을 문서화.
- UX 확장: Tabs(`전체/친구/지역`), 정렬/필터(점수/상승폭/최근 활동, 24h/7d/30d), 순위 변동 배지, 현재 사용자 하이라이트, 프로필 미리보기 모달. 모두 기존 토큰/컴포넌트 재사용.

## QA & Ops
- QA: 합산/상한 동작, 중복 차단, 비로그인 조회, 다크/라이트 테마, 모바일 1열/데스크톱 2열 레이아웃.
- 모니터링: 점수 급증, 순위 변동량, 배치 실패 알림(Sentry/Slack), 쿼리 성능(leaderboard 정렬).
- 마이그레이션 단계: (1) 이벤트 로그 적재 시작 → (2) 배치로 `profile_scores` 채우기 → (3) `/score` 데이터 소스 스위치 → (4) 필요 시 `profiles.points` deprecate.
