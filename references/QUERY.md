-- =============================================================================
-- Heyversus 애플리케이션을 위한 Supabase 데이터베이스 스키마 및 함수
--
-- 이 스크립트는 Heyversus 투표 애플리케이션에 필요한 테이블, 함수,
-- 그리고 행 수준 보안(RLS) 정책을 정의합니다.
--
-- 이 스크립트는 멱등성(idempotent)을 가지도록 설계되어, 여러 번 실행해도
-- 오류를 발생시키지 않으므로 개발 및 배포에 적합합니다.
-- =============================================================================

-- 1. UUID 확장 활성화
-- UUID(Universally Unique Identifiers) 생성을 위한 'uuid-ossp' 확장을 활성화합니다.
-- 이는 테이블에서 UUID를 기본 키로 사용하는 데 필수적입니다.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. 기존 행 수준 보안(RLS) 정책 정리
-- 이 명령들은 동일한 이름을 가진 기존 RLS 정책이 있다면 삭제하여,
-- 스크립트를 여러 번 실행할 때 "이미 존재함" 오류가 발생하는 것을 방지합니다.
DROP POLICY IF EXISTS "Allow read access to public polls and own private polls" ON public.polls;
DROP POLICY IF EXISTS "Allow public read access to polls" ON public.polls;
DROP POLICY IF EXISTS "Allow all users to read poll_options" ON public.poll_options;
DROP POLICY IF EXISTS "Allow authenticated users to vote" ON public.poll_options;
DROP POLICY IF EXISTS "Allow authenticated users to insert their own votes" ON public.user_votes;
DROP POLICY IF EXISTS "Allow authenticated users to read their own votes" ON public.user_votes;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;

-- Storage 정책 삭제 (Step 11 - 프로필 관리)
-- 주의: Storage 정책은 Supabase Dashboard > Storage > Policies에서 수동으로 삭제해야 합니다.
-- SQL Editor에서는 storage.objects 테이블에 대한 권한이 없습니다.
-- DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

DO $$
BEGIN
IF to_regclass('public.favorite_polls') IS NOT NULL THEN
DROP POLICY IF EXISTS "Allow authenticated users to insert favorites" ON public.favorite_polls;
DROP POLICY IF EXISTS "Allow authenticated users to read their favorites" ON public.favorite_polls;
DROP POLICY IF EXISTS "Allow authenticated users to delete their favorites" ON public.favorite_polls;
END IF;
END;

$$
;

-- =============================================================================
-- 12. Step 21 – 관리자 운영 대시보드 (MVP)
-- =============================================================================

-- 12-1. profiles.role 컬럼 추가 (기본값: user)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

-- role 값 제약 (user/admin)
DO
$$

BEGIN
IF NOT EXISTS (
SELECT 1 FROM pg_constraint
WHERE conname = 'profiles_role_check'
AND conrelid = 'public.profiles'::regclass
) THEN
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin'));
END IF;
END;

$$
;

-- ⚠️ 중요: role 컬럼은 일반 사용자가 업데이트할 수 없어야 합니다.
-- 컬럼 권한으로 role/points 등 민감 컬럼 업데이트를 차단합니다.
REVOKE UPDATE ON TABLE public.profiles FROM authenticated;
GRANT UPDATE (username, full_name, bio, avatar_url) ON TABLE public.profiles TO authenticated;

-- 12-2. 관리자 여부 헬퍼 함수
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS
$$
  SELECT
    (auth.role() = 'service_role')
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = COALESCE(p_user_id, auth.uid())
        AND p.role = 'admin'
    );
$$
;

-- 12-3. reports 테이블 (투표/사용자 신고)
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_type TEXT NOT NULL, -- 'poll' | 'user'
  poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason_code TEXT NOT NULL,
  reason_detail TEXT,
  status TEXT NOT NULL DEFAULT 'open', -- open | resolved | dismissed
  reporter_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  admin_note TEXT
);

-- target_type 제약 + status 제약
DO
$$

BEGIN
IF NOT EXISTS (
SELECT 1 FROM pg_constraint
WHERE conname = 'reports_target_check'
AND conrelid = 'public.reports'::regclass
) THEN
ALTER TABLE public.reports
ADD CONSTRAINT reports_target_check CHECK (
  (target_type = 'poll' AND poll_id IS NOT NULL AND target_user_id IS NULL)
  OR
  (target_type = 'user' AND target_user_id IS NOT NULL AND poll_id IS NULL)
);
END IF;

IF NOT EXISTS (
SELECT 1 FROM pg_constraint
WHERE conname = 'reports_target_type_check'
AND conrelid = 'public.reports'::regclass
) THEN
ALTER TABLE public.reports
ADD CONSTRAINT reports_target_type_check CHECK (target_type IN ('poll', 'user'));
END IF;

IF NOT EXISTS (
SELECT 1 FROM pg_constraint
WHERE conname = 'reports_status_check'
AND conrelid = 'public.reports'::regclass
) THEN
ALTER TABLE public.reports
ADD CONSTRAINT reports_status_check CHECK (status IN ('open', 'resolved', 'dismissed'));
END IF;
END;

$$
;

CREATE INDEX IF NOT EXISTS idx_reports_status_created_at
ON public.reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_poll_id ON public.reports(poll_id);
CREATE INDEX IF NOT EXISTS idx_reports_target_user_id ON public.reports(target_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_user_id ON public.reports(reporter_user_id);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 재실행 안전화를 위해 정책을 DROP 후 재생성합니다.
DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
DROP POLICY IF EXISTS "Users can view own reports" ON public.reports;
DROP POLICY IF EXISTS "Admins can view all reports" ON public.reports;
DROP POLICY IF EXISTS "Admins can update reports" ON public.reports;
DROP POLICY IF EXISTS "Admins can delete reports" ON public.reports;

CREATE POLICY "Users can create reports"
ON public.reports
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND reporter_user_id = auth.uid());

CREATE POLICY "Users can view own reports"
ON public.reports
FOR SELECT
USING (reporter_user_id = auth.uid());

CREATE POLICY "Admins can view all reports"
ON public.reports
FOR SELECT
USING (public.is_admin());

CREATE POLICY "Admins can update reports"
ON public.reports
FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete reports"
ON public.reports
FOR DELETE
USING (public.is_admin());

-- 12-4. 관리자 감사 로그 테이블
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id UUID NOT NULL REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at
ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor_created_at
ON public.admin_audit_logs(actor_user_id, created_at DESC);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read audit logs" ON public.admin_audit_logs;
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_logs;

CREATE POLICY "Admins can read audit logs"
ON public.admin_audit_logs
FOR SELECT
USING (public.is_admin());

CREATE POLICY "Admins can insert audit logs"
ON public.admin_audit_logs
FOR INSERT
WITH CHECK (public.is_admin());

-- 12-5. RPC: 관리자 role 설정 (부트스트랩/운영용)
DROP FUNCTION IF EXISTS public.set_profile_role(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.set_profile_role(p_user_id UUID, p_role TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS
$$

BEGIN
IF auth.role() <> 'service_role' AND public.is_admin() = FALSE THEN
RAISE EXCEPTION 'Admin only';
END IF;

    IF p_role NOT IN ('user', 'admin') THEN
        RAISE EXCEPTION 'Invalid role';
    END IF;

    UPDATE public.profiles
    SET role = p_role
    WHERE id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile not found';
    END IF;
END;

$$
;

-- 12-6. RPC: 신고 생성
DROP FUNCTION IF EXISTS public.create_report(TEXT, UUID, UUID, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.create_report(
  p_target_type TEXT,
  p_poll_id UUID DEFAULT NULL,
  p_target_user_id UUID DEFAULT NULL,
  p_reason_code TEXT,
  p_reason_detail TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS
$$

DECLARE
v_report_id UUID;
v_allowed_codes TEXT[] := ARRAY['spam', 'hate', 'sexual', 'violence', 'harassment', 'misinfo', 'other'];
BEGIN
IF auth.uid() IS NULL THEN
RAISE EXCEPTION 'Authentication required';
END IF;

    IF p_target_type NOT IN ('poll', 'user') THEN
        RAISE EXCEPTION 'Invalid target_type';
    END IF;

    IF p_reason_code IS NULL OR p_reason_code = '' OR NOT (p_reason_code = ANY(v_allowed_codes)) THEN
        RAISE EXCEPTION 'Invalid reason_code';
    END IF;

    IF p_target_type = 'poll' AND p_poll_id IS NULL THEN
        RAISE EXCEPTION 'poll_id is required';
    END IF;

    IF p_target_type = 'user' AND p_target_user_id IS NULL THEN
        RAISE EXCEPTION 'target_user_id is required';
    END IF;

    INSERT INTO public.reports (
      target_type,
      poll_id,
      target_user_id,
      reason_code,
      reason_detail,
      reporter_user_id
    )
    VALUES (
      p_target_type,
      CASE WHEN p_target_type = 'poll' THEN p_poll_id ELSE NULL END,
      CASE WHEN p_target_type = 'user' THEN p_target_user_id ELSE NULL END,
      p_reason_code,
      p_reason_detail,
      auth.uid()
    )
    RETURNING id INTO v_report_id;

    RETURN v_report_id;
END;

$$
;

-- 12-7. RPC: 관리자용 신고 목록 조회
DROP FUNCTION IF EXISTS public.get_reports_admin(TEXT, INT, INT);
CREATE OR REPLACE FUNCTION public.get_reports_admin(
  p_status TEXT DEFAULT 'open',
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  target_type TEXT,
  poll_id UUID,
  poll_question TEXT,
  poll_is_public BOOLEAN,
  poll_is_featured BOOLEAN,
  target_user_id UUID,
  target_username TEXT,
  reason_code TEXT,
  reason_detail TEXT,
  status TEXT,
  reporter_user_id UUID,
  reporter_username TEXT,
  created_at TIMESTAMPTZ,
  resolved_by UUID,
  resolved_by_username TEXT,
  resolved_at TIMESTAMPTZ,
  admin_note TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS
$$

BEGIN
IF public.is_admin() = FALSE THEN
RAISE EXCEPTION 'Admin only';
END IF;

    RETURN QUERY
    SELECT
      r.id,
      r.target_type,
      r.poll_id,
      p.question AS poll_question,
      p.is_public AS poll_is_public,
      p.is_featured AS poll_is_featured,
      r.target_user_id,
      tu.username AS target_username,
      r.reason_code,
      r.reason_detail,
      r.status,
      r.reporter_user_id,
      ru.username AS reporter_username,
      r.created_at,
      r.resolved_by,
      rbu.username AS resolved_by_username,
      r.resolved_at,
      r.admin_note
    FROM public.reports r
    LEFT JOIN public.polls p ON p.id = r.poll_id
    LEFT JOIN public.profiles ru ON ru.id = r.reporter_user_id
    LEFT JOIN public.profiles tu ON tu.id = r.target_user_id
    LEFT JOIN public.profiles rbu ON rbu.id = r.resolved_by
    WHERE (p_status = 'all' OR r.status = p_status)
    ORDER BY r.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;

$$
;

-- 12-8. RPC: 신고 처리(상태 변경 + 메모) + 감사 로그
DROP FUNCTION IF EXISTS public.resolve_report(UUID, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.resolve_report(
  p_report_id UUID,
  p_status TEXT,
  p_admin_note TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS
$$

DECLARE
v_actor UUID := auth.uid();
BEGIN
IF public.is_admin() = FALSE THEN
RAISE EXCEPTION 'Admin only';
END IF;

    IF p_status NOT IN ('open', 'resolved', 'dismissed') THEN
        RAISE EXCEPTION 'Invalid status';
    END IF;

    UPDATE public.reports
    SET
      status = p_status,
      admin_note = p_admin_note,
      resolved_by = CASE WHEN p_status = 'open' THEN NULL ELSE v_actor END,
      resolved_at = CASE WHEN p_status = 'open' THEN NULL ELSE now() END
    WHERE id = p_report_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Report not found';
    END IF;

    INSERT INTO public.admin_audit_logs (
      actor_user_id,
      action,
      target_type,
      target_id,
      payload
    )
    VALUES (
      v_actor,
      'resolve_report',
      'report',
      p_report_id,
      jsonb_build_object('status', p_status, 'admin_note', p_admin_note)
    );
END;

$$
;

-- 12-9. RPC: 운영 지표(JSONB) 조회
DROP FUNCTION IF EXISTS public.get_admin_stats(TEXT);
CREATE OR REPLACE FUNCTION public.get_admin_stats(p_range TEXT DEFAULT '7d')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS
$$

DECLARE
v_since TIMESTAMPTZ;
v_polls_created BIGINT;
v_votes_cast BIGINT;
v_favorites_added BIGINT;
v_active_users BIGINT;
v_open_reports BIGINT;
v_featured_polls BIGINT;
BEGIN
IF public.is_admin() = FALSE THEN
RAISE EXCEPTION 'Admin only';
END IF;

    IF p_range = '24h' THEN
      v_since := now() - interval '24 hours';
    ELSIF p_range = '7d' THEN
      v_since := now() - interval '7 days';
    ELSIF p_range = '30d' THEN
      v_since := now() - interval '30 days';
    ELSIF p_range = 'all' THEN
      v_since := '1970-01-01'::timestamptz;
    ELSE
      RAISE EXCEPTION 'Invalid range';
    END IF;

    SELECT COUNT(*) INTO v_polls_created
    FROM public.polls
    WHERE created_at >= v_since;

    SELECT COUNT(*) INTO v_votes_cast
    FROM public.user_votes
    WHERE created_at >= v_since;

    SELECT COUNT(*) INTO v_favorites_added
    FROM public.favorite_polls
    WHERE created_at >= v_since;

    SELECT COUNT(DISTINCT user_id) INTO v_active_users
    FROM public.user_votes
    WHERE created_at >= v_since;

    SELECT COUNT(*) INTO v_open_reports
    FROM public.reports
    WHERE status = 'open';

    SELECT COUNT(*) INTO v_featured_polls
    FROM public.polls
    WHERE is_featured = TRUE;

    RETURN jsonb_build_object(
      'range', p_range,
      'since', v_since,
      'polls_created', v_polls_created,
      'authenticated_votes_cast', v_votes_cast,
      'favorites_added', v_favorites_added,
      'active_users', v_active_users,
      'open_reports', v_open_reports,
      'featured_polls', v_featured_polls
    );
END;

$$
;

-- 12-10. RPC: 관리자 투표 액션 (공개/비공개, 대표 지정, 삭제) + 감사 로그
DROP FUNCTION IF EXISTS public.admin_set_poll_visibility(UUID, BOOLEAN);
CREATE OR REPLACE FUNCTION public.admin_set_poll_visibility(
  p_poll_id UUID,
  p_is_public BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS
$$

DECLARE
v_actor UUID := auth.uid();
BEGIN
IF public.is_admin() = FALSE THEN
RAISE EXCEPTION 'Admin only';
END IF;

    UPDATE public.polls
    SET is_public = p_is_public
    WHERE id = p_poll_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Poll not found';
    END IF;

    INSERT INTO public.admin_audit_logs (actor_user_id, action, target_type, target_id, payload)
    VALUES (
      v_actor,
      'admin_set_poll_visibility',
      'poll',
      p_poll_id,
      jsonb_build_object('is_public', p_is_public)
    );
END;

$$
;

DROP FUNCTION IF EXISTS public.admin_set_featured(UUID, BOOLEAN);
CREATE OR REPLACE FUNCTION public.admin_set_featured(
  p_poll_id UUID,
  p_is_featured BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS
$$

DECLARE
v_actor UUID := auth.uid();
BEGIN
IF public.is_admin() = FALSE THEN
RAISE EXCEPTION 'Admin only';
END IF;

    UPDATE public.polls
    SET is_featured = p_is_featured
    WHERE id = p_poll_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Poll not found';
    END IF;

    INSERT INTO public.admin_audit_logs (actor_user_id, action, target_type, target_id, payload)
    VALUES (
      v_actor,
      'admin_set_featured',
      'poll',
      p_poll_id,
      jsonb_build_object('is_featured', p_is_featured)
    );
END;

$$
;

DROP FUNCTION IF EXISTS public.admin_delete_poll(UUID);
CREATE OR REPLACE FUNCTION public.admin_delete_poll(p_poll_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS
$$

DECLARE
v_actor UUID := auth.uid();
BEGIN
IF public.is_admin() = FALSE THEN
RAISE EXCEPTION 'Admin only';
END IF;

    DELETE FROM public.polls
    WHERE id = p_poll_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Poll not found';
    END IF;

    INSERT INTO public.admin_audit_logs (actor_user_id, action, target_type, target_id, payload)
    VALUES (
      v_actor,
      'admin_delete_poll',
      'poll',
      p_poll_id,
      NULL
    );
END;

$$
;

-- 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin TO anon;
GRANT EXECUTE ON FUNCTION public.set_profile_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_report TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_reports_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_report TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_poll_visibility TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_featured TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_poll TO authenticated;

-- 기존 함수 정리 (반환 타입이 변경될 경우, REPLACE가 아닌 DROP 후 CREATE 해야 함)
DROP FUNCTION IF EXISTS public.get_polls_with_user_status();
DROP FUNCTION IF EXISTS public.get_poll_with_user_status(UUID);
DROP FUNCTION IF EXISTS public.get_featured_polls_with_user_status();
DROP FUNCTION IF EXISTS public.get_featured_polls_with_user_status();
DROP FUNCTION IF EXISTS public.check_username_exists(TEXT);
DROP FUNCTION IF EXISTS public.check_email_exists(TEXT);
DROP FUNCTION IF EXISTS public.toggle_favorite(UUID);
DROP FUNCTION IF EXISTS public.get_favorite_polls();
DROP FUNCTION IF EXISTS public.update_profile(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.get_profile(UUID);

-- 3. 테이블 정의
-- 'polls' 및 'poll_options' 테이블의 스키마를 정의합니다.
-- 'IF NOT EXISTS'는 테이블이 아직 존재하지 않을 경우에만 생성되도록 합니다.

-- 테이블: public.polls
-- 사용자가 생성한 각 투표에 대한 정보를 저장합니다.
CREATE TABLE IF NOT EXISTS public.polls (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- 투표의 고유 식별자 (UUID)
created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), -- 투표 생성 시각
question TEXT, -- 투표의 주요 질문/내용
created_by UUID, -- Supabase auth.users 테이블에 대한 외래 키, 생성자와 연결
is_public BOOLEAN NOT NULL DEFAULT TRUE, -- 투표가 공개(true)인지 비공개(false)인지 나타냅니다.
is_featured BOOLEAN DEFAULT FALSE -- 이 투표가 랜딩 페이지에 노출될 대표 투표인지 여부
);

-- 테이블: public.poll_options
-- 각 투표에 대한 개별 선택지들을 저장합니다.
CREATE TABLE IF NOT EXISTS public.poll_options (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- 선택지의 고유 식별자 (UUID)
created_at TIMESTAMP WITH TIME ZONE DEFAULT now(), -- 선택지 생성 시각
poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE, -- 'polls' 테이블에 대한 외래 키, 선택지를 해당 투표와 연결합니다.
-- ON DELETE CASCADE는 투표가 삭제될 때 해당 선택지들도 삭제되도록 합니다.
text TEXT, -- 투표 선택지의 텍스트 내용
votes INT DEFAULT 0, -- 이 선택지가 받은 투표 수
image_url TEXT, -- 선택지와 관련된 이미지의 선택적 URL
position INT NOT NULL DEFAULT 0 -- 생성/입력 순서를 명시적으로 저장합니다.
);

-- 기존 테이블에 position 컬럼이 없다면 추가하고, 기본값 0을 부여합니다.
ALTER TABLE public.poll_options
ADD COLUMN IF NOT EXISTS position INT NOT NULL DEFAULT 0;

-- 기존 데이터에 대해 생성 시각 순서로 position을 백필합니다.
WITH ranked_options AS (
    SELECT id, poll_id,
           ROW_NUMBER() OVER (PARTITION BY poll_id ORDER BY created_at, id) - 1 AS pos
    FROM public.poll_options
)
UPDATE public.poll_options po
SET position = r.pos
FROM ranked_options r
WHERE po.id = r.id;

-- 3.1. 테이블 스키마 수정 (기존 테이블에 컬럼 추가 및 제약 조건 변경)
-- 이 명령들은 스크립트가 여러 번 실행되더라도 안전하게 컬럼을 추가합니다.
ALTER TABLE public.polls ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE public.polls ADD COLUMN IF NOT EXISTS featured_image_url TEXT;
ALTER TABLE public.polls ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.polls ADD COLUMN IF NOT EXISTS status VARCHAR(255) DEFAULT 'open';

-- 기존 polls_created_by_fkey 제약 조건이 있다면 삭제합니다.
DO
$$

BEGIN
IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'polls_created_by_fkey' AND conrelid = 'public.polls'::regclass) THEN
ALTER TABLE public.polls DROP CONSTRAINT polls_created_by_fkey;
END IF;
IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'polls_created_by_fkey_new' AND conrelid = 'public.polls'::regclass) THEN
ALTER TABLE public.polls DROP CONSTRAINT polls_created_by_fkey_new;
END IF;
END;

$$
;

-- ON DELETE SET NULL 옵션을 포함한 새로운 외래 키 제약 조건을 추가합니다.
ALTER TABLE public.polls
ADD CONSTRAINT polls_created_by_fkey
FOREIGN KEY (created_by)
REFERENCES auth.users(id)
ON DELETE SET NULL;


-- 4. 데이터베이스 함수
-- 특정 비즈니스 로직을 캡슐화하는 PostgreSQL 함수를 정의하여,
-- RPC 호출을 통해 클라이언트에서 안전하고 효율적인 작업을 수행할 수 있도록 합니다.

-- 함수: public.create_new_poll
-- 새로운 투표와 그에 연결된 선택지들을 단일 트랜잭션으로 생성합니다.
-- 새로 생성된 투표의 UUID를 반환합니다.
CREATE OR REPLACE FUNCTION public.create_new_poll(
question_text TEXT, -- 새 투표의 질문
option_texts TEXT[], -- 투표 선택지들의 텍스트 배열
option_image_urls TEXT[] DEFAULT NULL, -- 선택지 이미지 경로(스토리지 객체 경로), option_texts와 동일 길이여야 함
is_public BOOLEAN DEFAULT TRUE, -- 투표가 공개되어야 하는지 여부를 나타내는 불리언 값
expires_at_param TIMESTAMPTZ DEFAULT NULL -- 투표 만료 시각
)
RETURNS UUID -- 새로 생성된 투표의 UUID를 반환합니다.
LANGUAGE plpgsql
SECURITY DEFINER -- 함수 소유자(예: supabase_admin)의 권한으로 실행되어,
-- 데이터 삽입과 같은 내부 작업을 위해 RLS를 우회할 수 있도록 합니다.
AS
$$

DECLARE
new_poll_id UUID; -- 새로 생성될 투표의 ID를 저장할 변수
option_text TEXT; -- 각 옵션 검증용 임시 변수
BEGIN
-- 서버 측 검증: 질문이 비어있는지 확인
IF question_text IS NULL OR trim(question_text) = '' THEN
RAISE EXCEPTION 'Question text cannot be empty.';
END IF;

    -- 서버 측 검증: 최소 2개 이상의 옵션이 있는지 확인
    IF option_texts IS NULL OR array_length(option_texts, 1) < 2 THEN
        RAISE EXCEPTION 'At least 2 options are required.';
    END IF;

    -- 서버 측 검증: 최대 6개 이하의 옵션인지 확인
    IF array_length(option_texts, 1) > 6 THEN
        RAISE EXCEPTION 'Maximum 6 options are allowed.';
    END IF;

    -- 서버 측 검증: 각 옵션이 비어있지 않은지 확인
    FOREACH option_text IN ARRAY option_texts
    LOOP
        IF option_text IS NULL OR trim(option_text) = '' THEN
            RAISE EXCEPTION 'All option texts must be non-empty.';
        END IF;
    END LOOP;

    -- 서버 측 검증: 만료 시간이 현재 시간보다 미래인지 확인 (null은 허용 - 영구 투표)
    IF expires_at_param IS NOT NULL AND expires_at_param <= now() THEN
        RAISE EXCEPTION 'Expiration time must be in the future.';
    END IF;

    -- 서버 측 검증: 이미지 경로 배열이 있을 경우 길이 일치 확인
    IF option_image_urls IS NOT NULL
       AND array_length(option_image_urls, 1) IS NOT NULL
       AND array_length(option_image_urls, 1) <> array_length(option_texts, 1) THEN
        RAISE EXCEPTION 'option_image_urls length must match option_texts length.';
    END IF;

    -- 'polls' 테이블에 새 투표를 삽입합니다.
    INSERT INTO public.polls (question, created_by, is_public, expires_at)
    VALUES (question_text, auth.uid(), is_public, expires_at_param) -- auth.uid()는 현재 인증된 사용자의 ID를 가져옵니다.
    RETURNING id INTO new_poll_id; -- 새로 생성된 투표의 ID를 검색합니다.

    -- 'option_texts' 배열의 각 선택지를 'poll_options' 테이블에 삽입합니다.
    -- unnest()는 배열을 행 집합으로 변환합니다.
    -- 순서를 보존하기 위해 배열의 인덱스를 position으로 함께 저장합니다.
    INSERT INTO public.poll_options (poll_id, text, votes, position, image_url)
    SELECT
        new_poll_id,
        opt_text,
        0,
        idx - 1,
        CASE
            WHEN option_image_urls IS NULL THEN NULL
            WHEN array_length(option_image_urls, 1) IS NULL THEN NULL
            ELSE option_image_urls[idx]
        END
    FROM UNNEST(option_texts) WITH ORDINALITY AS t(opt_text, idx);

    RETURN new_poll_id; -- 생성된 투표의 ID를 반환합니다.

END;

$$
;


-- 5. 행 수준 보안(RLS) 설정
--    테이블에 RLS를 활성화하고, 사용자 역할 및 인증 상태에 따라
--    데이터 접근을 제어하는 정책을 정의합니다.

--    'polls' 테이블에 RLS 활성화
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

--    정책: "Allow read access to public polls and own private polls"
--    모든 사용자(인증된 사용자 또는 익명 사용자)가 'polls' 테이블에서 데이터를 읽을 수 있도록 허용합니다.
-- 삭제 후 재생성으로 정책 업데이트
DROP POLICY IF EXISTS "Allow read access to public polls and own private polls" ON public.polls;
DROP POLICY IF EXISTS "Allow public read access to polls" ON public.polls;

CREATE POLICY "Allow read access to public polls and own private polls"
   ON public.polls
   FOR SELECT
   USING (
       is_public = true
       OR (is_public = false AND auth.uid() IS NOT NULL AND created_by = auth.uid())
   );

--    'poll_options' 테이블에 RLS 활성화
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;

--    정책: "Allow all users to read poll_options"
--    모든 사용자(인증된 사용자 또는 익명 사용자)가 'poll_options' 테이블에서 데이터를 읽을 수 있도록 허용합니다.
CREATE POLICY "Allow all users to read poll_options"
ON public.poll_options
FOR SELECT
USING (true);

--    정책: "Allow authenticated users to vote"
--    인증된 사용자만 'poll_options' 테이블의 'votes' 컬럼을 업데이트할 수 있도록 허용합니다.
--    'WITH CHECK'는 업데이트 전후 모두 사용자가 인증되었는지 확인합니다.
CREATE POLICY "Allow authenticated users to vote"
ON public.poll_options
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');


-- Table: public.user_votes
-- Stores records of which authenticated user voted on which poll.
CREATE TABLE IF NOT EXISTS public.user_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- 투표한 사용자의 ID
    poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE, -- 투표한 설문의 ID
    option_id UUID REFERENCES public.poll_options(id) ON DELETE CASCADE, -- 사용자가 선택한 옵션의 ID (감사용)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, poll_id) -- 한 사용자는 한 투표에 한 번만 투표할 수 있도록 강제
);

-- RLS 정책: user_votes 테이블
ALTER TABLE public.user_votes ENABLE ROW LEVEL SECURITY;

-- 정책: "Allow authenticated users to insert their own votes"
-- 인증된 사용자가 자신의 투표 기록을 삽입할 수 있도록 허용합니다.
CREATE POLICY "Allow authenticated users to insert their own votes"
ON public.user_votes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 정책: "Allow authenticated users to read their own votes"
-- 인증된 사용자가 자신의 투표 기록을 읽을 수 있도록 허용합니다.
CREATE POLICY "Allow authenticated users to read their own votes"
ON public.user_votes
FOR SELECT
USING (auth.uid() = user_id);

-- 즐겨찾기 테이블: favorite_polls
CREATE TABLE IF NOT EXISTS public.favorite_polls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, poll_id)
);

ALTER TABLE public.favorite_polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read their favorites"
ON public.favorite_polls
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to insert favorites"
ON public.favorite_polls
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to delete their favorites"
ON public.favorite_polls
FOR DELETE
USING (auth.uid() = user_id);

-- 함수: public.increment_vote
-- 특정 투표 선택지의 투표 수를 증가시키고, 사용자의 투표 기록을 남깁니다.
-- 공개 투표: 비로그인 사용자도 투표 가능 (클라이언트에서 중복 방지)
-- 비공개 투표: 로그인한 사용자만 투표 가능 (DB에서 중복 방지)
CREATE OR REPLACE FUNCTION public.increment_vote(
    option_id_to_update UUID, -- 투표 수를 증가시킬 투표 선택지의 UUID
    poll_id_for_vote UUID -- 투표 기록 확인을 위한 투표의 UUID
)
RETURNS void -- 이 함수는 어떤 값도 반환하지 않습니다.
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS
$$

DECLARE
current_user_id UUID := auth.uid();
target_poll RECORD;
BEGIN
-- 1. 투표 정보를 가져와서 유효성을 검사합니다.
SELECT is_public, expires_at, status INTO target_poll FROM public.polls WHERE id = poll_id_for_vote;

    IF target_poll IS NULL THEN
        RAISE EXCEPTION 'Poll not found.';
    END IF;

    IF target_poll.status = 'closed' OR target_poll.expires_at IS NOT NULL AND target_poll.expires_at < now() THEN
        RAISE EXCEPTION 'This poll is closed and no longer accepting votes.';
    END IF;

    -- 2. 사용자 상태와 투표 종류에 따라 로직을 분기합니다.
    IF current_user_id IS NOT NULL THEN
        -- --- 사용자가 로그인한 경우 ---
        -- user_votes 테이블을 확인하여 중복 투표를 방지합니다.
        IF EXISTS (SELECT 1 FROM public.user_votes WHERE user_id = current_user_id AND poll_id = poll_id_for_vote) THEN
            RAISE EXCEPTION 'User has already voted on this poll.';
        END IF;

        -- 투표 기록을 남깁니다.
        INSERT INTO public.user_votes (user_id, poll_id, option_id)
        VALUES (current_user_id, poll_id_for_vote, option_id_to_update);

        -- 참여 포인트를 지급합니다.
        UPDATE public.profiles
        SET points = points + 1
        WHERE id = current_user_id;

    ELSE
        -- --- 사용자가 비로그인한 경우 (익명) ---
        IF NOT target_poll.is_public THEN
            -- 비공개 투표는 익명으로 투표할 수 없습니다.
            RAISE EXCEPTION 'Authentication required to vote on this private poll.';
        END IF;
        -- 공개 투표는 익명으로 투표 가능합니다.
        -- (브라우저의 로컬 스토리지를 통해 중복 투표를 방지해야 합니다.)
    END IF;

    -- 3. 모든 검사를 통과하면, 선택지의 투표 수를 1 증가시킵니다.
    UPDATE public.poll_options
    SET votes = COALESCE(votes, 0) + 1
    WHERE id = option_id_to_update
    AND poll_id = poll_id_for_vote;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Option not found for this poll.';
    END IF;

END;

$$
;

-- 함수: public.get_polls_with_user_status
-- 모든 공개 투표 목록을 가져오면서, 현재 사용자가 각 투표에 투표했는지 여부를 함께 반환합니다.
CREATE OR REPLACE FUNCTION public.get_polls_with_user_status()
RETURNS TABLE (
    id UUID,
    created_at TIMESTAMPTZ,
    question TEXT,
    created_by UUID,
    is_public BOOLEAN,
    is_featured BOOLEAN,
    featured_image_url TEXT,
    expires_at TIMESTAMPTZ,
    status VARCHAR,
    has_voted BOOLEAN,
    is_favorited BOOLEAN,
    poll_options JSONB -- 선택지 정보를 JSONB 형태로 포함
)
LANGUAGE plpgsql
AS
$$

DECLARE
current_user_id UUID := auth.uid();
BEGIN
RETURN QUERY
SELECT
p.id,
p.created_at,
p.question,
p.created_by,
p.is_public,
p.is_featured,
p.featured_image_url,
p.expires_at,
p.status,
-- user_votes 테이블에 현재 사용자의 투표 기록이 있는지 확인
EXISTS(SELECT 1 FROM public.user_votes uv WHERE uv.poll_id = p.id AND uv.user_id = current_user_id) AS has_voted,
EXISTS(SELECT 1 FROM public.favorite_polls fp WHERE fp.poll_id = p.id AND fp.user_id = current_user_id) AS is_favorited,
-- 각 투표에 대한 선택지들을 투표 수(내림차순)에 따라 정렬하여 JSON 배열로 집계
(SELECT jsonb_agg(po ORDER BY po.position, po.created_at, po.id) FROM public.poll_options po WHERE po.poll_id = p.id) AS poll_options
FROM
public.polls p
WHERE
-- 공개 투표 또는 현재 사용자가 생성한 비공개 투표
p.is_public = TRUE
OR (p.is_public = FALSE AND current_user_id IS NOT NULL AND p.created_by = current_user_id)
ORDER BY
p.created_at DESC;
END;

$$
;

-- 함수: public.get_poll_with_user_status
-- ID를 기준으로 특정 투표 정보를 가져오면서, 현재 사용자가 투표했는지 여부를 함께 반환합니다.
CREATE OR REPLACE FUNCTION public.get_poll_with_user_status(p_id UUID)
RETURNS TABLE (
    id UUID,
    created_at TIMESTAMPTZ,
    question TEXT,
    created_by UUID,
    is_public BOOLEAN,
    is_featured BOOLEAN,
    featured_image_url TEXT,
    expires_at TIMESTAMPTZ,
    status VARCHAR,
    has_voted BOOLEAN,
    is_favorited BOOLEAN,
    poll_options JSONB
)
LANGUAGE plpgsql
AS
$$

DECLARE
current_user_id UUID := auth.uid();
BEGIN
RETURN QUERY
SELECT
p.id,
p.created_at,
p.question,
p.created_by,
p.is_public,
p.is_featured,
p.featured_image_url,
p.expires_at,
p.status,
EXISTS(SELECT 1 FROM public.user_votes uv WHERE uv.poll_id = p.id AND uv.user_id = current_user_id) AS has_voted,
EXISTS(SELECT 1 FROM public.favorite_polls fp WHERE fp.poll_id = p.id AND fp.user_id = current_user_id) AS is_favorited,
(SELECT jsonb_agg(po ORDER BY po.position, po.created_at, po.id) FROM public.poll_options po WHERE po.poll_id = p.id) AS poll_options
FROM
public.polls p
WHERE
p.id = p_id
-- 공개 투표 또는 현재 사용자가 생성한 비공개 투표만 접근 가능
AND (
p.is_public = TRUE
OR (p.is_public = FALSE AND current_user_id IS NOT NULL AND p.created_by = current_user_id)
);
END;

$$
;

-- 함수: public.get_featured_polls_with_user_status
-- is_featured 플래그가 true인 투표 목록을 가져오면서, 현재 사용자의 투표 상태를 함께 반환합니다.
CREATE OR REPLACE FUNCTION public.get_featured_polls_with_user_status()
RETURNS TABLE (
    id UUID,
    created_at TIMESTAMPTZ,
    question TEXT,
    created_by UUID,
    is_public BOOLEAN,
    is_featured BOOLEAN,
    featured_image_url TEXT,
    expires_at TIMESTAMPTZ,
    status VARCHAR,
    has_voted BOOLEAN,
    is_favorited BOOLEAN,
    poll_options JSONB
)
LANGUAGE plpgsql
AS
$$

DECLARE
current_user_id UUID := auth.uid();
BEGIN
RETURN QUERY
SELECT
p.id,
p.created_at,
p.question,
p.created_by,
p.is_public,
p.is_featured,
p.featured_image_url,
p.expires_at,
p.status,
EXISTS(SELECT 1 FROM public.user_votes uv WHERE uv.poll_id = p.id AND uv.user_id = current_user_id) AS has_voted,
EXISTS(SELECT 1 FROM public.favorite_polls fp WHERE fp.poll_id = p.id AND fp.user_id = current_user_id) AS is_favorited,
(SELECT jsonb_agg(po ORDER BY po.position, po.created_at, po.id) FROM public.poll_options po WHERE po.poll_id = p.id) AS poll_options
FROM
public.polls p
WHERE
p.is_featured = TRUE
ORDER BY
p.created_at DESC;
END;

$$
;

-- 함수: public.toggle_favorite
-- 즐겨찾기를 토글하고 현재 상태를 반환합니다.
CREATE OR REPLACE FUNCTION public.toggle_favorite(p_poll_id UUID)
RETURNS TABLE (is_favorited BOOLEAN)
LANGUAGE plpgsql
AS
$$

DECLARE
current_user_id UUID := auth.uid();
favorite_record_id UUID;
BEGIN
IF current_user_id IS NULL THEN
RAISE EXCEPTION 'Authentication required to toggle favorites.';
END IF;

    SELECT id INTO favorite_record_id
    FROM public.favorite_polls
    WHERE user_id = current_user_id AND poll_id = p_poll_id;

    IF favorite_record_id IS NOT NULL THEN
        DELETE FROM public.favorite_polls
        WHERE id = favorite_record_id;

        RETURN QUERY SELECT false;
    ELSE
        INSERT INTO public.favorite_polls (user_id, poll_id)
        VALUES (current_user_id, p_poll_id);

        RETURN QUERY SELECT true;
    END IF;

END;

$$
;

-- 함수: public.get_favorite_polls
-- 현재 사용자가 즐겨찾기한 투표 목록을 반환합니다.
CREATE OR REPLACE FUNCTION public.get_favorite_polls()
RETURNS TABLE (
    id UUID,
    created_at TIMESTAMPTZ,
    question TEXT,
    created_by UUID,
    is_public BOOLEAN,
    is_featured BOOLEAN,
    featured_image_url TEXT,
    expires_at TIMESTAMPTZ,
    status VARCHAR,
    has_voted BOOLEAN,
    is_favorited BOOLEAN,
    poll_options JSONB
)
LANGUAGE plpgsql
AS
$$

DECLARE
current_user_id UUID := auth.uid();
BEGIN
IF current_user_id IS NULL THEN
RAISE EXCEPTION 'Authentication required to view favorites.';
END IF;

    RETURN QUERY
    SELECT
        p.id,
        p.created_at,
        p.question,
        p.created_by,
        p.is_public,
        p.is_featured,
        p.featured_image_url,
        p.expires_at,
        p.status,
        EXISTS(SELECT 1 FROM public.user_votes uv WHERE uv.poll_id = p.id AND uv.user_id = current_user_id) AS has_voted,
        true AS is_favorited,
        (SELECT jsonb_agg(po ORDER BY po.position, po.created_at, po.id) FROM public.poll_options po WHERE po.poll_id = p.id) AS poll_options
    FROM
        public.favorite_polls fp
        JOIN public.polls p ON p.id = fp.poll_id
    WHERE
        fp.user_id = current_user_id
    ORDER BY
        fp.created_at DESC;

END;

$$
;

-- 함수: public.can_access_poll
-- 현재 사용자가 특정 투표에 접근할 수 있는지 확인합니다.
-- 공개 투표는 누구나 접근 가능, 비공개 투표는 생성자만 접근 가능합니다.
CREATE OR REPLACE FUNCTION public.can_access_poll(p_poll_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS
$$

DECLARE
current_user_id UUID := auth.uid();
poll_is_public BOOLEAN;
poll_creator UUID;
BEGIN
SELECT is_public, created_by INTO poll_is_public, poll_creator
FROM public.polls
WHERE id = p_poll_id;

    -- 투표가 존재하지 않으면 false
    IF poll_is_public IS NULL THEN
        RETURN false;
    END IF;

    -- 공개 투표면 true
    IF poll_is_public = true THEN
        RETURN true;
    END IF;

    -- 비공개 투표면 생성자인 경우에만 true
    IF current_user_id IS NOT NULL AND poll_creator = current_user_id THEN
        RETURN true;
    END IF;

    RETURN false;

END;

$$
;

-- 함수: public.get_my_polls_with_user_status
-- 현재 사용자가 생성한 모든 투표 (공개 + 비공개)를 반환합니다.
CREATE OR REPLACE FUNCTION public.get_my_polls_with_user_status()
RETURNS TABLE (
    id UUID,
    created_at TIMESTAMPTZ,
    question TEXT,
    created_by UUID,
    is_public BOOLEAN,
    is_featured BOOLEAN,
    featured_image_url TEXT,
    expires_at TIMESTAMPTZ,
    status VARCHAR,
    has_voted BOOLEAN,
    is_favorited BOOLEAN,
    poll_options JSONB
)
LANGUAGE plpgsql
AS
$$

DECLARE
current_user_id UUID := auth.uid();
BEGIN
IF current_user_id IS NULL THEN
RAISE EXCEPTION 'Authentication required to view your polls.';
END IF;

    RETURN QUERY
    SELECT
        p.id,
        p.created_at,
        p.question,
        p.created_by,
        p.is_public,
        p.is_featured,
        p.featured_image_url,
        p.expires_at,
        p.status,
        EXISTS(SELECT 1 FROM public.user_votes uv WHERE uv.poll_id = p.id AND uv.user_id = current_user_id) AS has_voted,
        EXISTS(SELECT 1 FROM public.favorite_polls fp WHERE fp.poll_id = p.id AND fp.user_id = current_user_id) AS is_favorited,
        (SELECT jsonb_agg(po ORDER BY po.position, po.created_at, po.id) FROM public.poll_options po WHERE po.poll_id = p.id) AS poll_options
    FROM
        public.polls p
    WHERE
        p.created_by = current_user_id
    ORDER BY
        p.created_at DESC;

END;

$$
;

-- 함수: public.check_username_exists
-- 입력받은 닉네임이 'profiles' 테이블에 이미 존재하는지 확인합니다.
CREATE OR REPLACE FUNCTION public.check_username_exists(username_to_check TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS
$$

BEGIN
RETURN EXISTS(SELECT 1 FROM public.profiles WHERE username = username_to_check);
END;

$$
;

-- 함수: public.check_email_exists
-- 입력받은 이메일이 'auth.users' 테이블에 이미 존재하는지 확인합니다.
-- SECURITY DEFINER로 실행되어야 auth 스키마에 접근 가능합니다.
CREATE OR REPLACE FUNCTION public.check_email_exists(email_to_check TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER AS
$$

BEGIN
RETURN EXISTS(SELECT 1 FROM auth.users WHERE email = email_to_check);
END;

$$
;

-- =============================================================================
-- 포인트 시스템 추가 (v0.8)
-- =============================================================================

-- 6. 사용자 프로필 테이블
-- 사용자별 공개 정보(닉네임, 포인트 등)를 저장합니다.
-- auth.users 테이블과 1:1 관계를 맺습니다.
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  points INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

-- profiles 테이블에 새로운 컬럼 추가 (Step 11 - 계정·프로필 관리 강화)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;

-- bio 길이 제한 제약 조건 추가 (최대 500자)
DO
$$

BEGIN
IF NOT EXISTS (
SELECT 1 FROM pg_constraint
WHERE conname = 'bio_length'
AND conrelid = 'public.profiles'::regclass
) THEN
ALTER TABLE public.profiles
ADD CONSTRAINT bio_length CHECK (char_length(bio) <= 500);
END IF;
END;

$$
;

-- RLS 정책: profiles 테이블
-- 모든 사용자가 프로필을 볼 수 있도록 허용합니다.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles
  FOR SELECT USING (true);
-- 사용자가 자신의 프로필(닉네임, 포인트)을 수정할 수 있도록 허용합니다.
CREATE POLICY "Users can update their own profile." ON public.profiles
  FOR UPDATE USING (auth.uid() = id);


-- 7. 신규 사용자 가입 시 프로필 자동 생성 트리거
-- auth.users 테이블에 새로운 사용자가 추가될 때마다, public.profiles 테이블에
-- 해당 사용자의 프로필을 자동으로 생성하는 함수 및 트리거입니다.

-- 트리거 함수
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER AS
$$

BEGIN
INSERT INTO public.profiles (id, username)
VALUES (new.id, new.raw_user_meta_data->>'username');
RETURN new;
END;

$$
;

-- 트리거 생성
-- 기존 트리거가 있다면 삭제하고 새로 만듭니다.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 8. 성능 최적화를 위한 인덱스 추가
-- =============================================================================

-- poll_options 테이블: poll_id로 자주 조회되므로 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON public.poll_options(poll_id);

-- user_votes 테이블: poll_id와 user_id로 자주 조회되므로 인덱스 추가
-- (user_id, poll_id)는 UNIQUE 제약조건이 있어 자동으로 인덱스가 생성되지만, 개별 컬럼 조회를 위한 인덱스도 추가)
CREATE INDEX IF NOT EXISTS idx_user_votes_poll_id ON public.user_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_user_votes_user_id ON public.user_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_polls_user_id ON public.favorite_polls(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_polls_poll_id ON public.favorite_polls(poll_id);

-- polls 테이블: is_featured, is_public, created_by로 필터링이 자주 발생
CREATE INDEX IF NOT EXISTS idx_polls_is_featured ON public.polls(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_polls_is_public ON public.polls(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_polls_created_by ON public.polls(created_by);

-- polls 테이블: created_at으로 정렬이 자주 발생 (최신순 조회)
CREATE INDEX IF NOT EXISTS idx_polls_created_at ON public.polls(created_at DESC);

-- profiles 테이블: username으로 조회가 발생 (이미 UNIQUE 제약조건이 있으므로 인덱스 자동 생성됨)
-- profiles 테이블: points로 정렬 (리더보드)
CREATE INDEX IF NOT EXISTS idx_profiles_points ON public.profiles(points DESC);

-- =============================================================================
-- 9. 투표 목록 페이지네이션을 위한 함수 및 인덱스
-- =============================================================================

-- 기존 페이지네이션 함수가 있다면 삭제
DROP FUNCTION IF EXISTS public.get_polls_paginated(INTEGER, INTEGER, TEXT, TEXT, TEXT);

-- 투표 목록 페이지네이션 함수 생성
CREATE OR REPLACE FUNCTION public.get_polls_paginated(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_sort_by TEXT DEFAULT 'created_at',
  p_sort_order TEXT DEFAULT 'desc',
  p_filter_status TEXT DEFAULT 'all'
)
RETURNS TABLE (
  id UUID,
  question TEXT,
  is_public BOOLEAN,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  status VARCHAR,
  created_by UUID,
  is_featured BOOLEAN,
  featured_image_url TEXT,
  poll_options JSONB,
  has_voted BOOLEAN,
  is_favorited BOOLEAN,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS
$$

DECLARE
total_polls BIGINT;
BEGIN
-- 전체 투표 수 집계 (페이지네이션 메타데이터용)
SELECT COUNT(*)
INTO total_polls
FROM public.polls p
WHERE
(p.is_public = TRUE OR p.created_by = auth.uid())
AND (
p_filter_status = 'all' OR
(p_filter_status = 'active' AND (p.status = 'active' OR (p.expires_at IS NULL OR p.expires_at > NOW()))) OR
(p_filter_status = 'closed' AND (p.status = 'closed' OR (p.expires_at IS NOT NULL AND p.expires_at <= NOW())))
);

-- 페이지네이션 결과 반환
RETURN QUERY
SELECT
p.id,
p.question,
p.is_public,
p.created_at,
p.expires_at,
COALESCE(p.status, 'active') AS status,
p.created_by,
COALESCE(p.is_featured, FALSE) AS is_featured,
p.featured_image_url,
COALESCE(
(
SELECT jsonb_agg(
jsonb_build_object(
'id', po.id,
'text', po.text,
'votes', COALESCE(po.votes, 0),
'image_url', po.image_url,
'created_at', po.created_at,
'position', po.position
)
ORDER BY po.position, po.created_at, po.id
)
FROM public.poll_options po
WHERE po.poll_id = p.id
),
'[]'::jsonb
) AS poll_options,
EXISTS(
SELECT 1
FROM public.user_votes uv
WHERE uv.poll_id = p.id
AND uv.user_id = auth.uid()
) AS has_voted,
EXISTS(
SELECT 1
FROM public.favorite_polls fp
WHERE fp.poll_id = p.id
AND fp.user_id = auth.uid()
) AS is_favorited,
total_polls AS total_count
FROM public.polls p
WHERE
(p.is_public = TRUE OR p.created_by = auth.uid())
AND (
p_filter_status = 'all' OR
(p_filter_status = 'active' AND (p.status = 'active' OR (p.expires_at IS NULL OR p.expires_at > NOW()))) OR
(p_filter_status = 'closed' AND (p.status = 'closed' OR (p.expires_at IS NOT NULL AND p.expires_at <= NOW())))
)
ORDER BY
CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'desc' THEN p.created_at END DESC,
CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'asc' THEN p.created_at END ASC,
CASE WHEN p_sort_by = 'expires_at' AND p_sort_order = 'desc' THEN p.expires_at END DESC NULLS LAST,
CASE WHEN p_sort_by = 'expires_at' AND p_sort_order = 'asc' THEN p.expires_at END ASC NULLS LAST,
CASE WHEN p_sort_by = 'votes' AND p_sort_order = 'desc' THEN (
SELECT COALESCE(SUM(po.votes), 0)
FROM public.poll_options po
WHERE po.poll_id = p.id
) END DESC,
CASE WHEN p_sort_by = 'votes' AND p_sort_order = 'asc' THEN (
SELECT COALESCE(SUM(po.votes), 0)
FROM public.poll_options po
WHERE po.poll_id = p.id
) END ASC
LIMIT p_limit
OFFSET p_offset;
END;

$$
;

-- 함수 실행 권한 부여
GRANT EXECUTE ON FUNCTION public.get_polls_paginated TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_polls_paginated TO anon;

-- 페이지네이션 관련 인덱스
CREATE INDEX IF NOT EXISTS idx_polls_expires_at ON public.polls(expires_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_polls_status ON public.polls(status);
CREATE INDEX IF NOT EXISTS idx_polls_public_creator ON public.polls(is_public, created_by);
CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id_votes ON public.poll_options(poll_id, votes);

-- =============================================================================
-- 실행 후 유용한 확인용 쿼리 (필요 시 주석 해제 후 실행)
-- =============================================================================
-- SELECT * FROM public.get_polls_paginated(20, 0, 'created_at', 'desc', 'all');
-- SELECT DISTINCT total_count FROM public.get_polls_paginated(10, 0, 'created_at', 'desc', 'all');
-- SELECT proname FROM pg_proc WHERE proname = 'get_polls_paginated';
-- SELECT indexname FROM pg_indexes WHERE tablename IN ('polls', 'poll_options') AND indexname LIKE 'idx_%';


-- =============================================================================
-- 8. Supabase Storage 버킷 설정 (Step 11 - 계정·프로필 관리 강화)
-- =============================================================================

-- 8-1. avatars 버킷 생성
-- 프로필 이미지를 저장하기 위한 Storage 버킷입니다.
-- Supabase Dashboard > Storage에서 직접 생성하거나 아래 SQL로 생성할 수 있습니다.

-- 버킷이 없으면 생성 (Supabase Dashboard에서 실행 또는 Migration으로 실행)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true, -- 공개 버킷 (URL로 직접 접근 가능)
  5242880, -- 5MB 파일 크기 제한
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'] -- 허용된 이미지 타입
)
ON CONFLICT (id) DO NOTHING;

-- 8-2. Storage RLS 정책 설정
--
-- ⚠️ 중요: Storage 정책은 Supabase Dashboard UI를 통해 설정해야 합니다!
-- SQL Editor에서는 storage.objects 테이블에 대한 권한이 없어 아래 SQL은 실행되지 않습니다.
--
-- 📋 Supabase Dashboard에서 수동으로 설정하는 방법:
-- Dashboard > Storage > avatars 버킷 선택 > Policies 탭으로 이동
--
-- ========================================================================
-- 🚀 가장 쉬운 방법: 템플릿 + 수동 정책 1개
-- ========================================================================
-- 1. "New Policy" 버튼 클릭
-- 2. 템플릿 선택:
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ 템플릿: "Give users access to only their own top level folder named    │
-- │         as uid"                                                         │
-- ├─────────────────────────────────────────────────────────────────────────┤
-- │ Policy name: Allow users to manage their own avatars                   │
-- │ 이 템플릿은 자동으로 INSERT, UPDATE, DELETE, SELECT 정책을 생성합니다  │
-- │ (사용자가 자신의 uid 폴더에만 접근 가능)                                 │
-- └─────────────────────────────────────────────────────────────────────────┘
--
-- 3. 공개 읽기 정책 수동 추가 (중요!)
--    템플릿 적용 후, 다시 "New Policy" 클릭:
--
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ 옵션: "For full customization" 선택                                     │
-- ├─────────────────────────────────────────────────────────────────────────┤
-- │ Policy name: Public read access for avatars                            │
-- │ Allowed operation: SELECT 체크                                          │
-- │ Policy definition: true                                                 │
-- │                                                                         │
-- │ 이 정책은 누구나 (로그인 안 한 사용자도) 아바타를 볼 수 있게 합니다    │
-- └─────────────────────────────────────────────────────────────────────────┘
--
-- ========================================================================
-- 또는 수동으로 정책 생성 (고급)
-- ========================================================================
-- "For full customization" 옵션 선택 시:
--
-- Policy 1: 공개 읽기 (누구나 아바타 조회)
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ Policy name: Public avatar images                                       │
-- │ Allowed operation: SELECT                                               │
-- │ Policy definition: true  (또는 bucket_id = 'avatars')                   │
-- └─────────────────────────────────────────────────────────────────────────┘
--
-- Policy 2: 업로드 (본인만)
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ Policy name: Users can upload their own avatar                          │
-- │ Allowed operation: INSERT                                               │
-- │ Policy definition (WITH CHECK):                                         │
-- │   (bucket_id = 'avatars'::text) AND                                     │
-- │   ((storage.foldername(name))[1] = (auth.uid())::text)                  │
-- └─────────────────────────────────────────────────────────────────────────┘
--
-- Policy 3: 수정 (본인만)
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ Policy name: Users can update their own avatar                          │
-- │ Allowed operation: UPDATE                                               │
-- │ Policy definition (USING):                                              │
-- │   (bucket_id = 'avatars'::text) AND                                     │
-- │   ((storage.foldername(name))[1] = (auth.uid())::text)                  │
-- └─────────────────────────────────────────────────────────────────────────┘
--
-- Policy 4: 삭제 (본인만)
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ Policy name: Users can delete their own avatar                          │
-- │ Allowed operation: DELETE                                               │
-- │ Policy definition (USING):                                              │
-- │   (bucket_id = 'avatars'::text) AND                                     │
-- │   ((storage.foldername(name))[1] = (auth.uid())::text)                  │
-- └─────────────────────────────────────────────────────────────────────────┘


-- =============================================================================
-- 9. 프로필 업데이트 RPC 함수 (Step 11)
-- =============================================================================

-- 9-1. update_profile 함수
-- 사용자가 자신의 프로필 정보를 업데이트할 수 있는 함수입니다.
-- 보안을 위해 RPC 함수를 사용하여 비즈니스 로직을 서버 측에서 처리합니다.

CREATE OR REPLACE FUNCTION public.update_profile(
  p_username TEXT DEFAULT NULL,
  p_full_name TEXT DEFAULT NULL,
  p_bio TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS
$$

DECLARE
v_user_id UUID;
v_current_username TEXT;
v_username_exists BOOLEAN;
v_result JSON;
BEGIN
-- 현재 로그인한 사용자 ID 확인
v_user_id := auth.uid();

IF v_user_id IS NULL THEN
RAISE EXCEPTION 'Not authenticated';
END IF;

-- 현재 사용자명 조회
SELECT username INTO v_current_username
FROM public.profiles
WHERE id = v_user_id;

-- username이 변경되는 경우 중복 체크
IF p_username IS NOT NULL AND p_username != v_current_username THEN
-- username 중복 확인
SELECT EXISTS (
SELECT 1 FROM public.profiles
WHERE username = p_username AND id != v_user_id
) INTO v_username_exists;

    IF v_username_exists THEN
      RAISE EXCEPTION 'Username already exists';
    END IF;

    -- username 길이 검증 (3자 이상)
    IF char_length(p_username) < 3 THEN
      RAISE EXCEPTION 'Username must be at least 3 characters';
    END IF;

END IF;

-- bio 길이 검증 (500자 이하)
IF p_bio IS NOT NULL AND char_length(p_bio) > 500 THEN
RAISE EXCEPTION 'Bio must be 500 characters or less';
END IF;

-- 프로필 업데이트
UPDATE public.profiles
SET
username = COALESCE(p_username, username),
full_name = COALESCE(p_full_name, full_name),
bio = COALESCE(p_bio, bio),
avatar_url = COALESCE(p_avatar_url, avatar_url),
updated_at = now()
WHERE id = v_user_id;

-- 업데이트된 프로필 정보 반환
SELECT json_build_object(
'id', p.id,
'username', p.username,
'full_name', p.full_name,
'bio', p.bio,
'avatar_url', p.avatar_url,
'points', p.points,
'created_at', u.created_at,
'updated_at', p.updated_at
) INTO v_result
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE p.id = v_user_id;

RETURN v_result;
END;

$$
;

-- 9-2. get_profile 함수 (프로필 조회 헬퍼 함수)
-- 사용자 ID로 프로필 정보를 조회하는 함수입니다.

CREATE OR REPLACE FUNCTION public.get_profile(p_user_id UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS
$$

DECLARE
v_user_id UUID;
v_result JSON;
v_points NUMERIC := 0;
v_last_activity TIMESTAMPTZ;
v_score NUMERIC;
BEGIN
-- p_user_id가 NULL이면 현재 로그인한 사용자 ID 사용
v_user_id := COALESCE(p_user_id, auth.uid());

IF v_user_id IS NULL THEN
RAISE EXCEPTION 'User ID is required';
END IF;

-- 프로필 정보 조회
SELECT json_build_object(
'id', p.id,
'username', p.username,
'full_name', p.full_name,
'bio', p.bio,
'avatar_url', p.avatar_url,
'points', p.points,
'created_at', u.created_at,
'updated_at', p.updated_at,
'email', u.email
) INTO v_result
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE p.id = v_user_id;

IF v_result IS NULL THEN
RAISE EXCEPTION 'Profile not found';
END IF;

-- 점수 계산: 이벤트 합산 → 집계 테이블 → 기존 points 순으로 폴백
SELECT
COALESCE(SUM(e.weight), 0),
MAX(e.occurred_at)
INTO v_points, v_last_activity
FROM public.profile_score_events e
WHERE e.user_id = v_user_id;

IF v_points = 0 THEN
SELECT score, last_activity_at
INTO v_score, v_last_activity
FROM public.profile_scores
WHERE user_id = v_user_id
LIMIT 1;

v_points := COALESCE(v_score, v_points, 0);
END IF;

IF v_points = 0 THEN
SELECT points
INTO v_score
FROM public.profiles
WHERE id = v_user_id
LIMIT 1;

v_points := COALESCE(v_score, v_points, 0);
END IF;

RETURN json_build_object(
'id', (v_result ->> 'id')::UUID,
'username', v_result ->> 'username',
'full_name', v_result ->> 'full_name',
'bio', v_result ->> 'bio',
'avatar_url', v_result ->> 'avatar_url',
'points', v_points,
'last_activity_at', v_last_activity,
'created_at', v_result ->> 'created_at',
'updated_at', v_result ->> 'updated_at',
'email', v_result ->> 'email'
);
END;

$$
;


-- =============================================================================
-- 테스트 쿼리 (Step 11 - 프로필 관리)
-- =============================================================================
-- SELECT * FROM public.get_profile(); -- 현재 사용자 프로필 조회
-- SELECT * FROM public.get_profile('user-uuid-here'); -- 특정 사용자 프로필 조회
-- SELECT * FROM public.update_profile(p_username := 'newusername', p_bio := 'Hello World!');
-- SELECT * FROM storage.buckets WHERE id = 'avatars';

-- =============================================================================
-- Step 18 - 리더보드/점수 시스템 (초안)
-- =============================================================================

-- 1) 점수 집계 테이블
CREATE TABLE IF NOT EXISTS public.profile_scores (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL DEFAULT 0,
  last_activity_at TIMESTAMPTZ,
  raw_points_cache NUMERIC,
  weekly_cap_hit BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_scores_score_desc ON public.profile_scores (score DESC);
CREATE INDEX IF NOT EXISTS idx_profile_scores_last_activity ON public.profile_scores (last_activity_at DESC);

ALTER TABLE public.profile_scores ENABLE ROW LEVEL SECURITY;

DO
$$

BEGIN
IF NOT EXISTS (
SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profile_scores' AND policyname = 'Allow public read of profile_scores'
) THEN
CREATE POLICY "Allow public read of profile_scores"
ON public.profile_scores
FOR SELECT
USING (true);
END IF;

IF NOT EXISTS (
SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profile_scores' AND policyname = 'Service role insert profile_scores'
) THEN
CREATE POLICY "Service role insert profile_scores"
ON public.profile_scores
FOR INSERT
WITH CHECK (auth.role() = 'service_role');
END IF;

IF NOT EXISTS (
SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profile_scores' AND policyname = 'Service role update profile_scores'
) THEN
CREATE POLICY "Service role update profile_scores"
ON public.profile_scores
FOR UPDATE
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
END IF;

IF NOT EXISTS (
SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profile_scores' AND policyname = 'Service role delete profile_scores'
) THEN
CREATE POLICY "Service role delete profile_scores"
ON public.profile_scores
FOR DELETE
USING (auth.role() = 'service_role');
END IF;
END $$;

-- 2) 점수 이벤트 로그 (중복 방지 인덱스 포함)
CREATE TABLE IF NOT EXISTS public.profile_score_events (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
event_type TEXT NOT NULL,
poll_id UUID,
weight NUMERIC NOT NULL,
metadata JSONB,
occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
occurred_on DATE GENERATED ALWAYS AS ((occurred_at AT TIME ZONE 'UTC')::date) STORED
);

CREATE INDEX IF NOT EXISTS idx_profile_score_events_user ON public.profile_score_events (user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_score_events_event ON public.profile_score_events (event_type, occurred_at DESC);

ALTER TABLE public.profile_score_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
-- dedup 고유 제약이 없으면 인덱스가 있어도 드롭 후 제약으로 재생성
IF NOT EXISTS (
SELECT 1 FROM pg_constraint WHERE conname = 'ux_profile_score_events_dedup' AND conrelid = 'public.profile_score_events'::regclass
) THEN
IF EXISTS (
SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'ux_profile_score_events_dedup'
) THEN
DROP INDEX public.ux_profile_score_events_dedup;
END IF;

    ALTER TABLE public.profile_score_events
      ADD CONSTRAINT ux_profile_score_events_dedup UNIQUE (user_id, event_type, poll_id, occurred_on);

END IF;

IF NOT EXISTS (
SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profile_score_events' AND policyname = 'Service role insert score_events'
) THEN
CREATE POLICY "Service role insert score_events"
ON public.profile_score_events
FOR INSERT
WITH CHECK (auth.role() = 'service_role');
END IF;

IF NOT EXISTS (
SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profile_score_events' AND policyname = 'Service role select score_events'
) THEN
CREATE POLICY "Service role select score_events"
ON public.profile_score_events
FOR SELECT
USING (auth.role() = 'service_role');
END IF;

IF NOT EXISTS (
SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profile_score_events' AND policyname = 'Service role update score_events'
) THEN
CREATE POLICY "Service role update score_events"
ON public.profile_score_events
FOR UPDATE
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
END IF;

IF NOT EXISTS (
SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profile_score_events' AND policyname = 'Service role delete score_events'
) THEN
CREATE POLICY "Service role delete score_events"
ON public.profile_score_events
FOR DELETE
USING (auth.role() = 'service_role');
END IF;
END $$;

-- 3) 점수 리프레시 함수 (집계 전용)
CREATE OR REPLACE FUNCTION public.refresh_profile_scores(
p_limit INT DEFAULT 500,
p_offset INT DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
v_now TIMESTAMPTZ := now();
BEGIN
WITH target_users AS (
SELECT user_id
FROM (
SELECT DISTINCT user_id
FROM public.profile_score_events
ORDER BY user_id
OFFSET p_offset
LIMIT p_limit
) t
),
aggregated AS (
SELECT
e.user_id,
COALESCE(SUM(e.weight), 0) AS total_score,
MAX(e.occurred_at) AS last_activity_at
FROM public.profile_score_events e
JOIN target_users t ON t.user_id = e.user_id
GROUP BY e.user_id
)
INSERT INTO public.profile_scores (
user_id,
score,
last_activity_at,
updated_at
)
SELECT
a.user_id,
a.total_score,
a.last_activity_at,
v_now
FROM aggregated a
ON CONFLICT (user_id) DO UPDATE
SET
score = EXCLUDED.score,
last_activity_at = EXCLUDED.last_activity_at,
updated_at = v_now;
END;

$$
;

-- 4) 리더보드 조회 함수 (정렬/스코프/기간 파라미터 지원, delta/region은 placeholder)
CREATE OR REPLACE FUNCTION public.get_leaderboard(
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0,
  p_scope TEXT DEFAULT 'global', -- 'global' | 'friends' | 'region'
  p_sort_by TEXT DEFAULT 'score', -- 'score' | 'delta' | 'recent_activity'
  p_sort_order TEXT DEFAULT 'desc', -- 'asc' | 'desc'
  p_period TEXT DEFAULT 'all', -- '24h' | '7d' | '30d' | 'all' (추가 기간 필터는 후속)
  p_region TEXT DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  rank BIGINT,
  score NUMERIC,
  display_name TEXT,
  avatar_url TEXT,
  delta NUMERIC,
  last_activity_at TIMESTAMPTZ,
  region TEXT,
  total_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS
$$

WITH base AS (
SELECT
ps.user_id,
ps.score,
COALESCE(p.username, '익명') AS display_name,
p.avatar_url,
ps.last_activity_at,
NULL::NUMERIC AS delta,
NULL::TEXT AS region
FROM public.profile_scores ps
LEFT JOIN public.profiles p ON p.id = ps.user_id
),
scoped AS (
  SELECT *
  FROM base
  WHERE (p_scope = 'global')
    AND (p_region IS NULL OR region = p_region)
),
ranked AS (
  SELECT
    b.*,
    ROW_NUMBER() OVER (
      ORDER BY
        CASE p_sort_by
          WHEN 'score' THEN b.score
          WHEN 'delta' THEN COALESCE(b.delta, 0)
          WHEN 'recent_activity' THEN EXTRACT(EPOCH FROM COALESCE(b.last_activity_at, now() - INTERVAL '365 days'))
          ELSE b.score
        END
        *
        CASE WHEN p_sort_order = 'desc' THEN 1 ELSE -1 END DESC,
        b.user_id
    ) AS rank,
    COUNT(*) OVER () AS total_count
  FROM scoped b
)
SELECT
user_id,
rank,
score,
display_name,
avatar_url,
delta,
last_activity_at,
region,
total_count
FROM ranked
OFFSET p_offset
LIMIT p_limit;

$$
;

-- 5) 점수 이벤트 기록 함수 (중복 방지 + 기본 가중치)
CREATE OR REPLACE FUNCTION public.log_score_event(
  p_event_type TEXT,
  p_poll_id UUID DEFAULT NULL,
  p_weight_override NUMERIC DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS
$$

DECLARE
v_user_id UUID;
v_weight NUMERIC;
v_now TIMESTAMPTZ := now();
v_row JSON;
BEGIN
v_user_id := COALESCE(p_user_id, auth.uid());

IF v_user_id IS NULL THEN
RAISE EXCEPTION 'Not authenticated';
END IF;

IF p_event_type NOT IN ('vote', 'create_poll', 'share', 'streak3', 'streak7') THEN
RAISE EXCEPTION 'Unsupported event type: %', p_event_type;
END IF;

v_weight := COALESCE(
p_weight_override,
CASE p_event_type
WHEN 'vote' THEN 1
WHEN 'create_poll' THEN 3
WHEN 'share' THEN 2
WHEN 'streak3' THEN 1
WHEN 'streak7' THEN 2
ELSE 0
END
);

INSERT INTO public.profile_score_events (
user_id,
event_type,
poll_id,
weight,
metadata,
occurred_at
)
VALUES (
v_user_id,
p_event_type,
p_poll_id,
v_weight,
p_metadata,
v_now
)
ON CONFLICT ON CONSTRAINT ux_profile_score_events_dedup
DO UPDATE
SET weight = EXCLUDED.weight,
metadata = COALESCE(EXCLUDED.metadata, public.profile_score_events.metadata),
occurred_at = EXCLUDED.occurred_at
RETURNING json_build_object(
'id', id,
'user_id', user_id,
'event_type', event_type,
'poll_id', poll_id,
'weight', weight,
'metadata', metadata,
'occurred_at', occurred_at
) INTO v_row;

RETURN v_row;
END;

$$
;

-- =============================================================================
-- 10. Step 19 – 투표 이미지 업로드 (poll_images 버킷 + image_url + create_new_poll 확장)
-- =============================================================================

-- 10-1. poll_options.image_url 컬럼을 보강합니다. (존재하지 않을 경우 추가)
ALTER TABLE public.poll_options
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 10-2. poll_images 버킷 생성 (비공개, 10MB, JPEG/PNG/WebP)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'poll_images',
  'poll_images',
  false,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 10-3. Storage RLS 정책 설정 (Supabase Dashboard UI에서만 설정 가능)
--   - SQL로 `storage.objects`를 직접 변경하면 “must be owner of table objects” 오류가 발생합니다.
--   - Dashboard > Storage > poll_images > Policies에서 다음 두 정책을 추가해 주세요:
--     - Policy name: `poll_images owners manage`, Operations: ALL, Expression/Check:
--       `bucket_id = 'poll_images' AND split_part(name, '/', 1) = auth.uid()::text`
--     - Policy name: `poll_images service access`, Operations: ALL, Roles: service_role, Expression/Check:
--       `bucket_id = 'poll_images'`

-- 10-4. create_new_poll 함수는 option_image_urls 배열을 받아 image_url을 함께 저장합니다.
--       (상단의 함수 정의를 최신 버전으로 교체 후 실행)

-- =============================================================================
-- 11. Step 20 – 비공개 투표 언리스트드 링크 + 정원 제한(max_voters)
-- =============================================================================

-- 11-1. polls.max_voters 컬럼 추가 (비공개에서만 사용, NULL=제한 없음)
ALTER TABLE public.polls
ADD COLUMN IF NOT EXISTS max_voters INT;

-- 전체 재실행 안전을 위해 기존 create_new_poll(구 시그니처)를 제거합니다.
DROP FUNCTION IF EXISTS public.create_new_poll(TEXT, TEXT[], TEXT[], BOOLEAN, TIMESTAMPTZ);

-- 11-2. create_new_poll 함수 확장: max_voters_param 추가
CREATE OR REPLACE FUNCTION public.create_new_poll(
question_text TEXT, -- 새 투표의 질문
option_texts TEXT[], -- 투표 선택지들의 텍스트 배열
option_image_urls TEXT[] DEFAULT NULL, -- 선택지 이미지 경로(스토리지 객체 경로)
is_public BOOLEAN DEFAULT TRUE, -- 공개/비공개 여부
expires_at_param TIMESTAMPTZ DEFAULT NULL, -- 투표 만료 시각
max_voters_param INT DEFAULT NULL -- 비공개 투표 정원 제한(선착순), NULL=제한 없음
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS
$$

DECLARE
new_poll_id UUID;
option_text TEXT;
BEGIN
IF question_text IS NULL OR trim(question_text) = '' THEN
RAISE EXCEPTION 'Question text cannot be empty.';
END IF;

    IF option_texts IS NULL OR array_length(option_texts, 1) < 2 THEN
        RAISE EXCEPTION 'At least 2 options are required.';
    END IF;

    IF array_length(option_texts, 1) > 6 THEN
        RAISE EXCEPTION 'Maximum 6 options are allowed.';
    END IF;

    FOREACH option_text IN ARRAY option_texts
    LOOP
        IF option_text IS NULL OR trim(option_text) = '' THEN
            RAISE EXCEPTION 'All option texts must be non-empty.';
        END IF;
    END LOOP;

    IF expires_at_param IS NOT NULL AND expires_at_param <= now() THEN
        RAISE EXCEPTION 'Expiration time must be in the future.';
    END IF;

    IF option_image_urls IS NOT NULL
       AND array_length(option_image_urls, 1) IS NOT NULL
       AND array_length(option_image_urls, 1) <> array_length(option_texts, 1) THEN
        RAISE EXCEPTION 'option_image_urls length must match option_texts length.';
    END IF;

    -- 공개 투표는 정원 제한을 사용하지 않습니다.
    IF is_public = TRUE THEN
        max_voters_param := NULL;
    END IF;

    IF max_voters_param IS NOT NULL AND max_voters_param <= 0 THEN
        RAISE EXCEPTION 'max_voters must be positive.';
    END IF;

    INSERT INTO public.polls (question, created_by, is_public, expires_at, max_voters)
    VALUES (question_text, auth.uid(), is_public, expires_at_param, max_voters_param)
    RETURNING id INTO new_poll_id;

    INSERT INTO public.poll_options (poll_id, text, votes, position, image_url)
    SELECT
        new_poll_id,
        opt_text,
        0,
        idx - 1,
        CASE
            WHEN option_image_urls IS NULL THEN NULL
            WHEN array_length(option_image_urls, 1) IS NULL THEN NULL
            ELSE option_image_urls[idx]
        END
    FROM UNNEST(option_texts) WITH ORDINALITY AS t(opt_text, idx);

    RETURN new_poll_id;
END;

$$
;

-- 11-3. 언리스트드 링크 모델 접근 제어
-- 공개 투표는 누구나 접근 가능, 비공개 투표는 로그인 사용자라면 링크로 접근 가능
CREATE OR REPLACE FUNCTION public.can_access_poll(p_poll_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS
$$

DECLARE
current_user_id UUID := auth.uid();
poll_is_public BOOLEAN;
BEGIN
SELECT is_public INTO poll_is_public
FROM public.polls
WHERE id = p_poll_id;

    IF poll_is_public IS NULL THEN
        RETURN false;
    END IF;

    IF poll_is_public = true THEN
        RETURN true;
    END IF;

    RETURN current_user_id IS NOT NULL;
END;

$$
;

-- 전체 재실행 안전을 위해 기존 get_poll_with_user_status를 제거합니다.
DROP FUNCTION IF EXISTS public.get_poll_with_user_status(UUID);

-- 11-4. 상세 조회 RPC 권한 모델 변경 + max_voters 포함
CREATE OR REPLACE FUNCTION public.get_poll_with_user_status(p_id UUID)
RETURNS TABLE (
    id UUID,
    created_at TIMESTAMPTZ,
    question TEXT,
    created_by UUID,
    is_public BOOLEAN,
    is_featured BOOLEAN,
    featured_image_url TEXT,
    expires_at TIMESTAMPTZ,
    status VARCHAR,
    max_voters INT,
    has_voted BOOLEAN,
    is_favorited BOOLEAN,
    poll_options JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS
$$

DECLARE
current_user_id UUID := auth.uid();
BEGIN
RETURN QUERY
SELECT
p.id,
p.created_at,
p.question,
p.created_by,
p.is_public,
p.is_featured,
p.featured_image_url,
p.expires_at,
p.status,
p.max_voters,
EXISTS(SELECT 1 FROM public.user_votes uv WHERE uv.poll_id = p.id AND uv.user_id = current_user_id) AS has_voted,
EXISTS(SELECT 1 FROM public.favorite_polls fp WHERE fp.poll_id = p.id AND fp.user_id = current_user_id) AS is_favorited,
(SELECT jsonb_agg(po ORDER BY po.position, po.created_at, po.id) FROM public.poll_options po WHERE po.poll_id = p.id) AS poll_options
FROM
public.polls p
WHERE
p.id = p_id
AND (
p.is_public = TRUE
OR (p.is_public = FALSE AND current_user_id IS NOT NULL)
);
END;

$$
;

-- 11-5. increment_vote 정원 제한 및 자동 마감(max_voters)
CREATE OR REPLACE FUNCTION public.increment_vote(
    option_id_to_update UUID,
    poll_id_for_vote UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS
$$

DECLARE
current_user_id UUID := auth.uid();
target_poll RECORD;
voters_before INT := 0;
BEGIN
SELECT id, is_public, expires_at, status, max_voters INTO target_poll
FROM public.polls
WHERE id = poll_id_for_vote
FOR UPDATE;

    IF target_poll IS NULL THEN
        RAISE EXCEPTION 'Poll not found.';
    END IF;

    IF target_poll.status = 'closed' OR target_poll.expires_at IS NOT NULL AND target_poll.expires_at < now() THEN
        RAISE EXCEPTION 'This poll is closed and no longer accepting votes.';
    END IF;

    IF current_user_id IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM public.user_votes WHERE user_id = current_user_id AND poll_id = poll_id_for_vote) THEN
            RAISE EXCEPTION 'User has already voted on this poll.';
        END IF;

        -- 비공개 + 정원 제한이 있는 경우, 선착순 상한을 원자적으로 강제합니다.
        IF target_poll.is_public = FALSE AND target_poll.max_voters IS NOT NULL THEN
            SELECT COUNT(DISTINCT user_id) INTO voters_before
            FROM public.user_votes
            WHERE poll_id = poll_id_for_vote;

            IF voters_before >= target_poll.max_voters THEN
                UPDATE public.polls
                SET status = 'closed'
                WHERE id = poll_id_for_vote;
                RAISE EXCEPTION 'This poll has reached the maximum number of voters.';
            END IF;
        END IF;

        INSERT INTO public.user_votes (user_id, poll_id, option_id)
        VALUES (current_user_id, poll_id_for_vote, option_id_to_update);

        UPDATE public.profiles
        SET points = points + 1
        WHERE id = current_user_id;

    ELSE
        IF NOT target_poll.is_public THEN
            RAISE EXCEPTION 'Authentication required to vote on this private poll.';
        END IF;
    END IF;

    UPDATE public.poll_options
    SET votes = COALESCE(votes, 0) + 1
    WHERE id = option_id_to_update
    AND poll_id = poll_id_for_vote;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Option not found for this poll.';
    END IF;

    -- N번째 투표 성공 직후 자동 마감
    IF current_user_id IS NOT NULL
       AND target_poll.is_public = FALSE
       AND target_poll.max_voters IS NOT NULL
       AND voters_before + 1 >= target_poll.max_voters THEN
        UPDATE public.polls
        SET status = 'closed'
        WHERE id = poll_id_for_vote;
    END IF;

END;

$$
;
