# 랜덤 옵션 돌림판 구현 계획 (Step 16)

**상태**: ✅ 구현 완료 (`src/app/poll/[id]/PollClient.tsx`, v0.6.x)  
**요약**: 상세 페이지에서 conic-gradient 기반 돌림판 모달을 제공하며, 스핀 쿨다운/중복 클릭 차단, 토스트 안내, 자동 옵션 선택 하이라이트까지 포함해 Step 16 목표를 충족했습니다.

## 1. 목표

- `/poll/[id]` 상세 페이지에서 선택하기 어려운 옵션을 “돌림판”으로 랜덤 추천.
- 자동 투표는 하지 않고, 선택만 강조 → 사용자가 직접 투표 버튼을 눌러 확정.
- 이미 투표/마감된 경우, 옵션 1개 이하인 경우에는 돌림판 트리거를 숨김.

## 2. UI 설계 (모달/오버레이)

- 트리거 버튼: 옵션 영역 하단에 "돌림판으로 골라줘" (disabled: hasVoted || isPollClosed || options.length <= 1)
- 오버레이 구조:
  - Dimmed 배경 + 중앙 카드(rounded, shadow)
  - 헤더: 제목 "돌림판으로 옵션 추천" + 닫기 버튼
  - 본문: 원형 돌림판 (슬라이스 = 옵션 수) + 회전/감속 애니메이션
  - 푸터: "돌리기" 버튼 (cooldown 적용), 결과 안내 문구
  - 결과 강조: 당첨 슬라이스 하이라이트 + 토스트 "OO 옵션이 당첨! 직접 투표 버튼을 눌러주세요"

## 3. 상태/로직

- 상태: `isOpen`, `isSpinning`, `selectedIndex`, `cooldownUntil`(Date), `highlightOptionId`
- 동작 플로우:
  1) 트리거 클릭 → `isOpen=true`, init 상태
  2) "돌리기" 클릭 → 쿨다운 체크 → 난수로 targetIndex 선택 → 애니메이션 1.5~2s → `selectedIndex` 확정 → `highlightOptionId` 설정 → 토스트 표시
  3) 모달 닫기 → 옵션 리스트로 돌아가 highlight 유지 (예: 5초 or 사용자가 해제)
- 쿨다운: 예) 3초, 버튼 disabled 처리
- 중복: 이미 투표/마감/옵션 1개 → 트리거 숨김

## 4. 스타일/애니메이션

- CSS keyframes 회전 + ease-out 감속, 모바일에서도 2초 이내 완주
- 슬라이스 색상은 옵션 인덱스로 HSL 분산 or 테마 색상 반복
- 당첨 시 슬라이스 테두리/글로우 + 중앙 배지
- 모달는 Tailwind 유틸로 구현 (backdrop, rounded, shadow)

## 5. 데이터/연동

- 추가 API/RPC 없음: 이미 내려받은 `poll.poll_options` 사용
- 당첨 결과는 로컬 상태만 사용, 서버 저장/로그 없음 (추후 이벤트 로그 필요시 `/api/analytics` 고려)
- 투표는 기존 "투표하기" 버튼을 눌러야만 실행 → 주석/토스트로 안내

## 6. UX 가드

- 접근성: 버튼/결과에 `aria-live`/토스트로 결과 전달, 키보드 포커스 이동
- 반응형: 모바일 44px 터치, 최대 높이 제한(overflow-auto)
- 실패/취소: 애니메이션 중 재클릭 방지, 닫기 시 상태 초기화

## 7. TODO 체크리스트 (실행 결과)

- [x] UI 컴포넌트 추가: 기존 `PollClient`에 모달/오버레이를 직접 포함해 `RandomRouletteModal` 역할 수행 (`isRouletteOpen` + 오버레이 DOM).
- [x] 상태/로직 추가: `isRouletteOpen`, `isSpinning`, `cooldownUntil`, `highlightOptionId`(`rouletteResultOptionId`), `spinRotation` 상태로 스핀/결과/쿨다운 관리.
- [x] 트리거 버튼 노출 조건: `showRouletteTrigger = !isVoted && !isPollClosed && poll_options.length > 1`.
- [x] 애니메이션/스타일: conic-gradient + 회전 애니메이션(`ROULETTE_ANIMATION_MS=5000`, `ROULETTE_BASE_ROTATIONS=8`), ease-out cubic bezier 적용.
- [x] 결과 강조: 당첨 옵션을 `rouletteResultOptionId`로 표기하고 토스트 `"옵션 당첨"` 메시지 노출, 옵션 리스트/슬라이스 하이라이트.
- [x] 쿨다운/재클릭 방지: `ROULETTE_COOLDOWN_MS=1000` + `cooldownRemaining`으로 안내 토스트/버튼 비활성화.
- [x] 접근성/반응형: 모달 `role="dialog"` + `aria-modal` 적용, 버튼 최소 44px, 모바일에서 단일 컬럼 정렬.
- [x] QA: 이미 투표/마감/옵션 1개 이하일 때 트리거 숨김, 탭 전환 시 상태 초기화(`useVisibilityChange`), 스핀 타임아웃 클린업 추가.

## 추가 메모 (텍스트 표시 관련)

- 현재 구현: 원형 돌림판은 conic-gradient만 사용해 색상 슬라이스만 보이고, 옵션 텍스트는 외부 리스트/토스트로 안내.
- 슬라이스 안에 텍스트를 넣으려면, gradient 대신 옵션 개수만큼 절대 배치된 요소를 `transform: rotate(sliceAngle * index)`로 회전시키고, 반지름 위치에 텍스트를 배치해야 함. 배경 대비 색상/폰트 크기 가이드 필요.
- 비용을 줄이려면 “당첨 슬라이스만 중앙 배지로 텍스트 표시” 방식으로도 해결 가능. 어느 쪽으로 갈지 결정 필요.
- 현재 구현은 텍스트를 외부 리스트/토스트로 안내하는 방식으로 유지(추가 배치 작업은 보류).
