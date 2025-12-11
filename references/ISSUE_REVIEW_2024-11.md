# Issue Review (2024-11)

## 컨텍스트
- 범위: Next.js 15.5.2, React 19.1.0 기반 heyversus 프로덕션 코드 리뷰
- 주요 관심사: 사용자 데이터 격리, 라우트 타입 정합성, 초기 상태 정확도, 테스트 커버리지

## 주요 이슈
1) 사용자별 데이터 캐싱 누출 위험 (심각)  
- 위치: `src/lib/services/polls.ts`의 `getPolls`, `getPollById`  
- 문제: 쿠키 기반 `createClient()`를 사용한 RPC 호출 결과를 `unstable_cache`로 전역 캐싱 → `has_voted`, `is_favorited`, 비공개 투표 등 사용자별 데이터가 다른 사용자에게 섞여 노출될 수 있음. `/api/polls?paginated=false` 경로도 동일 리스크.
2) Next.js params 타입 오용  
- 위치: `src/app/poll/[id]/page.tsx`, `src/app/api/polls/[id]/route.ts`, `src/app/api/polls/[id]/vote/route.ts`  
- 문제: `params`를 `Promise<{ id: string }>`로 선언/`await`하여 Next가 기대하는 동기 시그니처와 불일치. Next 14 이하나 타입 검증 시 즉시 실패 가능, 정적 최적화·타입 보장 깨짐.
3) 로그인 사용자의 초기 상태 정확도 부족  
- 위치: `/polls` 프리패치(`src/app/polls/page.tsx`)는 익명 클라이언트 사용, 클라이언트 훅(`src/hooks/useInfinitePolls.ts`)은 30초 `staleTime`에 의존.  
- 문제: 로그인 사용자가 첫 렌더에서 즐겨찾기/투표 상태가 모두 false로 표시됐다가 후속 fetch 이후 뒤늦게 갱신. 초기 페인트 정확도·신뢰성 저하.
4) 테스트 커버리지 공백  
- 위치: `src/__tests__/utils.test.ts` 단일 유틸 테스트만 존재.  
- 문제: 핵심 플로우(투표/즐겨찾기/권한/RPC 에러) 및 API 라우트, React Query 훅에 대한 회귀 방지 장치 부재.

## 권장 대응
- 캐시 격리: 사용자 컨텍스트가 필요한 서비스는 `unstable_cache` 제거 또는 익명 클라이언트 전용 캐시로 분리. `/api/polls`의 `paginated=false` 경로는 캐시 없이 직접 호출로 대체.
- 라우트 시그니처 수정: 모든 `params` 타입을 `{ params: { id: string } }` 형태로 교정.
- 초기 상태 정합성: 로그인 세션이 확인되면 `/polls` 초기 쿼리 강제 refetch 또는 서버 프리패치에서 세션 클라이언트 사용. React Query `placeholderData` 대신 `initialData`+즉시 동기화 고려.
- 테스트 추가: `/api/polls` GET/POST, `/api/polls/[id]` 404/403, `usePollVote` 오류 롤백, 즐겨찾기 토글 성공/권한 실패 등을 RTL/Jest로 커버.
