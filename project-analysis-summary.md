# Heyversus 프로젝트 분석 및 오류 해결 상황

## 프로젝트 개요

- **기술 스택**: Next.js 15.5.2 + React 19.1.0 + TypeScript + Tailwind CSS v4
- **목적**: 투표 웹 애플리케이션
- **백엔드**: Supabase

## 주요 기능

- 투표 생성/참여/조회
- 실시간 투표 결과 표시
- 링크 공유 기능
- 인증 시스템 (로그인/회원가입)

## 해결된 오류들

### 1. PollPageProps 타입 오류

- **문제**: `PollPageProps` 타입이 정의되지 않음
- **해결**: 함수 파라미터에 인라인 타입 `{ params: { id: string } }` 사용

### 2. create_new_poll 함수 오류

- **문제**: Supabase에 `create_new_poll` 함수가 없음
- **해결**: SQL 함수 생성 완료

```sql
CREATE OR REPLACE FUNCTION create_new_poll(
  title_text TEXT,
  option_texts TEXT[],
  is_public BOOLEAN
)
RETURNS UUID
```

### 3. increment_vote 함수 생성

- **해결**: SQL 함수 생성 완료

```sql
CREATE OR REPLACE FUNCTION increment_vote(option_id UUID)
RETURNS VOID
```

### 4. question vs title 필드 불일치

- **문제**: DB는 `title` 컬럼, 코드는 `question` 사용
- **해결**: `src/lib/types.ts`에서 `question` → `title`로 수정

## 현재 상태

- ✅ 투표 생성 기능: 정상 작동
- ✅ 투표 조회 기능: 정상 작동
- ⚠️ 투표하기 기능: RPC 파라미터 불일치 이슈 존재

## DB 스키마

- **polls**: id, title, is_public, created_at, user_id
- **poll_options**: id, poll_id, text, votes, image_url, created_at

## 남은 이슈들

### 1. increment_vote RPC 파라미터 불일치

**문제**: 코드에서 다른 파라미터명 사용

- `src/app/poll/[id]/PollClient.tsx`: `option_id` (올바름)
- `src/app/polls/PollsClient.tsx`: `option_id_to_update`, `poll_id_for_vote`
- `src/app/FeaturedPollClient.tsx`: `option_id_to_update`, `poll_id_for_vote`

**해결 방안**: DB 함수 시그니처에 맞춰 모든 호출을 `option_id`로 통일

### 2. 일부 컴포넌트에서 여전히 poll.question 사용

**문제**: 타입 수정 후에도 일부 파일에서 `poll.question` 참조

- `src/app/FeaturedPollClient.tsx`: `poll.question` 사용
- `src/app/home/PollsClient.tsx`: `poll.question` 사용

**해결 방안**: 모든 `poll.question`을 `poll.title`로 변경

## 다음 단계

1. increment_vote RPC 호출 파라미터 통일
2. 남은 poll.question 참조를 poll.title로 변경
3. 전체 기능 테스트
