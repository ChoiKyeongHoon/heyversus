# 프로젝트 리스크 및 버그 진단 보고서

**날짜**: 2025-12-15
**작성자**: Antigravity (AI Assistant)
**대상**: heyversus 프로젝트

## 1. 개요
본 문서는 `heyversus` 프로젝트의 코드베이스, 설정 파일, 데이터베이스 스키마에 대한 전반적인 리스크 및 버그 진단 결과를 기록합니다. 진단은 정적 분석, 보안 점검, 아키텍처 리뷰로 나뉘어 진행되었습니다.

## 2. 진단 결과 요약

| 카테고리 | 상태 | 주요 발견 사항 |
| --- | --- | --- |
| **정적 분석** | ✅ 양호 | Lint 경고(Deprecated) 외 심각한 오류 없음. 타입 체크 통과. |
| **보안 점검** | ⚠️ 주의 | `handle_new_user` 함수 내 `search_path` 설정 누락 (보안 취약점). |
| **아키텍처** | ✅ 양호 | Next.js App Router 표준 구조 준수. |
| **설정 관리** | ✅ 양호 | `.env` 파일 관리 및 시크릿 노출 없음. |

---

## 3. 상세 분석 내용

### 3.1. 보안 취약점: `handle_new_user` Search Path 누락

- **문제점**: `references/QUERY.md` 파일에 정의된 `handle_new_user` 트리거 함수가 `SECURITY DEFINER` 옵션을 사용하고 있으나, `search_path`를 명시적으로 설정(`SET search_path = public`)하지 않았습니다.
- **위험도**: **중~상 (Medium to High)**
- **설명**: `SECURITY DEFINER` 함수는 생성한 소유자의 권한으로 실행됩니다. `search_path`가 고정되지 않으면, 악의적인 사용자가 임시 테이블이나 함수 등을 이용해 스키마 검색 경로를 조작(Search Path Hijacking)하여 의도치 않은 객체를 실행하게 만들 수 있습니다.
- **참고**: 프로젝트 내 `supabase-handle-new-user-search-path-warning.md` 문서에서도 동일한 문제에 대한 경고와 해결책을 제시하고 있습니다.
- **관련 코드 (`references/QUERY.md`)**:
  ```sql
  CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  -- ❌ Missing: SET search_path = public
  AS $$
  BEGIN
    INSERT INTO public.profiles (id, username)
    VALUES (new.id, new.raw_user_meta_data->>'username');
    RETURN new;
  END;
  $$;
  ```
- **권장 조치**: ~~해당 함수 정의에 `SET search_path = public`을 추가하여 스키마 검색 경로를 고정해야 합니다.~~ → **2025-12-15 수정 완료**.

### 3.2. 정적 분석 (Static Analysis)
- **Lint**: `npm run lint` 실행 결과, Next.js 관련 Deprecated 경고 외에 코드 실행을 방해하는 Critical한 린트 에러는 발견되지 않았습니다.
- **Type Check**: `tsc --noEmit` 실행 결과, TypeScript 컴파일 오류가 없습니다.
- **순환 참조**: 프로젝트 구조상 순환 참조를 유발할 만한 복잡한 의존성은 발견되지 않았습니다.

### 3.3. 시크릿 및 환경 변수 점검
- **.env 관리**: `.env.local.example` 파일은 안전한 템플릿 형태로 관리되고 있으며, 실제 시크릿 키는 포함되어 있지 않습니다.
- **하드코딩된 시크릿**: 소스 코드(`src/`) 내에 `sk-`, `eyJ` 등 일반적인 API 키나 토큰 패턴을 스캔한 결과, 하드코딩된 유출 사례는 발견되지 않았습니다.

### 3.4. 데이터베이스 스키마 및 함수 검토
- **`create_new_poll`**: 이전 버전과 달리 `references/QUERY.md`의 최신 정의(Step 20)에서는 `SET search_path = public`이 올바르게 적용되어 있어 안전합니다.
- **관리자 함수**: `is_admin`, `create_report`, `admin_` 접두사가 붙은 함수들은 모두 `SET search_path`가 적용되어 있습니다.

## 4. 결론 및 향후 계획
현재 프로젝트는 전반적으로 안정적이고 관리가 잘 되고 있으나, **`handle_new_user` 함수의 보안 패치가 시급합니다.**

1.  **즉시 조치**: `references/QUERY.md` 파일에서 `handle_new_user` 함수를 수정.
2.  **검증**: 수정된 SQL을 Supabase에서 실행하여 Warning 해소 확인.
3.  **지속적 관리**: 향후 `SECURITY DEFINER` 함수 추가 시 `search_path` 설정을 필수 체크리스트에 포함.
