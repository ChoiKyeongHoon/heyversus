# Step 22 – 대표/대표 이미지 캐시 동기화 플랜

## 목표
- `/admin`에서 대표 투표/대표 이미지가 바뀔 때 ISR 캐시를 즉시 무효화하여 메인/대표 카드에서 외부 이미지가 즉시 반영되도록 한다.
- 캐시 무효화 시에도 기본 투표/즐겨찾기/투표 액션 로직에는 영향을 주지 않도록 안전하게 구현한다.

## 적용 대상
| 변경 지점 | 캐시 태그 | 무효화 경로 |
| --- | --- | --- |
| `/admin/polls/[id]/feature` | `CACHE_TAGS.FEATURED_POLLS`, `CACHE_TAGS.POLLS`, `CACHE_TAGS.POLL(id)` | `revalidatePath("/")`, `revalidatePath("/polls")` |
| `/admin/poll-options/[id]/image` | 동일 태그 + 관련 poll id | 동일 경로 |

## 가이드
1. revalidateTag는 기존 소비자가 활용하는 캐시(개별 태그 기반)만 무효화하고, revalidatePath는 ISR HTML/JSON을 즉시 제거한다.
2. 캐시 무효화는 대표 변경 API의 마지막 단계에서만 수행해 트랜잭션 충돌을 막고, 실패하면 관리자에게 에러를 반환한다.
3. `revalidatePath("/")`만으로 부족한 경우(예: `/polls` 목록도 대표 이미지 노출 시) `revalidatePath("/polls")` 등을 추가한다.

## 추후 작업
- 캐시 무효화 동작을 검증하는 통합 테스트/로그(관리자 액션 로그 + revalidate 호출 여부) 추가.
- 0.7.5 릴리스 문서(`README`, `ROADMAP`)와 병행하여 배포 및 QA 가이드에 반영한다.
