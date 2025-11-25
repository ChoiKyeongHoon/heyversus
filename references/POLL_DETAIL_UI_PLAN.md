# poll/[id] UI 리뉴얼 초안

## 목표
- polls/score와 시각 톤을 맞춘 상세 전용 카드/레이아웃을 도입한다.
- 기존 투표/룰렛 로직(`usePollVote` + `PollClient`)에는 손대지 않고, 렌더 파트를 교체한다.

## 작업 단계

### 1) PollDetailCard 신규 생성
- 위치: `src/components/polls/PollDetailCard.tsx`.
- 베이스: 현 `PollCard`의 레이아웃/색/여백 클래스를 그대로 복사해 톤을 맞춘다.
- props 예시: `poll`, `isPollClosed`, `hasVoted`, `selectedOptionId`, `onSelectOption(optionId)`, `onVote()`, `onToggleFavorite?`, `favoritePending?`, `canFavorite?`, `isFavorited?`, `timeRemaining`.
- 제외: 목록용 필터/메타/링크. CTA는 상세 컨텍스트에 맞게 "투표하기 / 결과 보기"만 남기고 링크 이동은 제거한다.

### 2) 상세 클라이언트에 적용
- 대상: `src/app/poll/[id]/PollClient.tsx`.
- `usePollVote`/룰렛 등 기존 로직은 유지하고 렌더 영역만 `PollDetailCard`로 교체한다.
- 핸들러 연결: `onSelectOption`/`onVote`에 현 핸들러를 그대로 연결하고, `selectedOptionId`/`hasVoted`/`isPollClosed` 계산값을 전달한다.
- 즐겨찾기 유지 시 `onToggleFavorite`/`isFavorited`/`favoritePending`/`canFavorite`도 prop으로 내려준다.

### 3) 레이아웃 톤 맞추기
- 컨테이너: polls/score와 동일한 `container mx-auto px-4 md:px-6 lg:px-8` 래퍼 사용.
- 상단 메트릭: 남은 시간/총 투표수/선두 옵션 등을 작은 섹션으로 정리(필요하면 `PollDetailHero`로 분리)해 PollsHero 톤과 맞춘다.

### 4) 스타일 공통화
- 색/여백/폰트 클래스는 PollCard와 동일하게 유지한다.
- 반복 클래스는 추후 `components/polls/styles.ts` 등으로 분리 가능하도록 네이밍만 정리(`CARD_WRAPPER`, `BADGE_BASE` 등).

## 메모
- 목록(polls) 구조 변경과 decouple하기 위한 상세 전용 컴포넌트이므로, 목록 전용 프롭/메타는 최대한 제거.
- 향후 `/polls` 리프레시 시 동일 컨벤션으로 보완해 두 페이지 간 일관성 확보(로드맵 Step 17 후속).
