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
DROP POLICY IF EXISTS "Allow public read access to polls" ON public.polls;
DROP POLICY IF EXISTS "Allow all users to read poll_options" ON public.poll_options;
DROP POLICY IF EXISTS "Allow authenticated users to vote" ON public.poll_options;
DROP POLICY IF EXISTS "Allow authenticated users to insert their own votes" ON public.user_votes;
DROP POLICY IF EXISTS "Allow authenticated users to read their own votes" ON public.user_votes;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
DO $$
BEGIN
  IF to_regclass('public.favorite_polls') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Allow authenticated users to insert favorites" ON public.favorite_polls;
    DROP POLICY IF EXISTS "Allow authenticated users to read their favorites" ON public.favorite_polls;
    DROP POLICY IF EXISTS "Allow authenticated users to delete their favorites" ON public.favorite_polls;
  END IF;
END;
$$;

-- 기존 함수 정리 (반환 타입이 변경될 경우, REPLACE가 아닌 DROP 후 CREATE 해야 함)
DROP FUNCTION IF EXISTS public.get_polls_with_user_status();
DROP FUNCTION IF EXISTS public.get_poll_with_user_status(UUID);
DROP FUNCTION IF EXISTS public.get_featured_polls_with_user_status();
DROP FUNCTION IF EXISTS public.get_featured_polls_with_user_status();
DROP FUNCTION IF EXISTS public.check_username_exists(TEXT);
DROP FUNCTION IF EXISTS public.check_email_exists(TEXT);
DROP FUNCTION IF EXISTS public.toggle_favorite(UUID);
DROP FUNCTION IF EXISTS public.get_favorite_polls();

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
image_url TEXT -- 선택지와 관련된 이미지의 선택적 URL
);

-- 3.1. 테이블 스키마 수정 (기존 테이블에 컬럼 추가 및 제약 조건 변경)
-- 이 명령들은 스크립트가 여러 번 실행되더라도 안전하게 컬럼을 추가합니다.
ALTER TABLE public.polls ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE public.polls ADD COLUMN IF NOT EXISTS featured_image_url TEXT;
ALTER TABLE public.polls ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.polls ADD COLUMN IF NOT EXISTS status VARCHAR(255) DEFAULT 'open';

-- 기존 polls_created_by_fkey 제약 조건이 있다면 삭제합니다.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'polls_created_by_fkey' AND conrelid = 'public.polls'::regclass) THEN
    ALTER TABLE public.polls DROP CONSTRAINT polls_created_by_fkey;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'polls_created_by_fkey_new' AND conrelid = 'public.polls'::regclass) THEN
    ALTER TABLE public.polls DROP CONSTRAINT polls_created_by_fkey_new;
  END IF;
END;
$$;

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
is_public BOOLEAN, -- 투표가 공개되어야 하는지 여부를 나타내는 불리언 값
expires_at_param TIMESTAMPTZ -- 투표 만료 시각
)
RETURNS UUID -- 새로 생성된 투표의 UUID를 반환합니다.
LANGUAGE plpgsql
SECURITY DEFINER -- 함수 소유자(예: supabase_admin)의 권한으로 실행되어,
-- 데이터 삽입과 같은 내부 작업을 위해 RLS를 우회할 수 있도록 합니다.
AS $$
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

    -- 'polls' 테이블에 새 투표를 삽입합니다.
    INSERT INTO public.polls (question, created_by, is_public, expires_at)
    VALUES (question_text, auth.uid(), is_public, expires_at_param) -- auth.uid()는 현재 인증된 사용자의 ID를 가져옵니다.
    RETURNING id INTO new_poll_id; -- 새로 생성된 투표의 ID를 검색합니다.

    -- 'option_texts' 배열의 각 선택지를 'poll_options' 테이블에 삽입합니다.
    -- unnest()는 배열을 행 집합으로 변환합니다.
    INSERT INTO public.poll_options (poll_id, text, votes)
    SELECT new_poll_id, unnest(option_texts), 0; -- 각 선택지의 투표 수를 0으로 초기화합니다.

    RETURN new_poll_id; -- 생성된 투표의 ID를 반환합니다.

END;
$$;


-- 5. 행 수준 보안(RLS) 설정
--    테이블에 RLS를 활성화하고, 사용자 역할 및 인증 상태에 따라
--    데이터 접근을 제어하는 정책을 정의합니다.

--    'polls' 테이블에 RLS 활성화
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

--    정책: "Allow public read access to polls"
--    모든 사용자(인증된 사용자 또는 익명 사용자)가 'polls' 테이블에서 데이터를 읽을 수 있도록 허용합니다.
CREATE POLICY "Allow public read access to polls"
   ON public.polls
   FOR SELECT
   USING (true);

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
AS $$
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
    SET votes = votes + 1
    WHERE id = option_id_to_update;

END;
$$;

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
AS $$
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
(SELECT jsonb_agg(po ORDER BY po.votes DESC) FROM public.poll_options po WHERE po.poll_id = p.id) AS poll_options
FROM
public.polls p
WHERE
p.is_public = TRUE
ORDER BY
p.created_at DESC;
END;
$$;

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
AS $$
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
(SELECT jsonb_agg(po ORDER BY po.votes DESC) FROM public.poll_options po WHERE po.poll_id = p.id) AS poll_options
FROM
public.polls p
WHERE
p.id = p_id;
END;
$$;

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
AS $$
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
        (SELECT jsonb_agg(po ORDER BY po.votes DESC) FROM public.poll_options po WHERE po.poll_id = p.id) AS poll_options
    FROM
        public.polls p
    WHERE
        p.is_featured = TRUE
    ORDER BY
        p.created_at DESC;
END;
$$;

-- 함수: public.toggle_favorite
-- 즐겨찾기를 토글하고 현재 상태를 반환합니다.
CREATE OR REPLACE FUNCTION public.toggle_favorite(p_poll_id UUID)
RETURNS TABLE (is_favorited BOOLEAN)
LANGUAGE plpgsql
AS $$
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
$$;

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
AS $$
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
        (SELECT jsonb_agg(po ORDER BY po.votes DESC) FROM public.poll_options po WHERE po.poll_id = p.id) AS poll_options
    FROM
        public.favorite_polls fp
        JOIN public.polls p ON p.id = fp.poll_id
    WHERE
        fp.user_id = current_user_id
    ORDER BY
        fp.created_at DESC;
END;
$$;

-- 함수: public.check_username_exists
-- 입력받은 닉네임이 'profiles' 테이블에 이미 존재하는지 확인합니다.
CREATE OR REPLACE FUNCTION public.check_username_exists(username_to_check TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS(SELECT 1 FROM public.profiles WHERE username = username_to_check);
END;
$$;

-- 함수: public.check_email_exists
-- 입력받은 이메일이 'auth.users' 테이블에 이미 존재하는지 확인합니다.
-- SECURITY DEFINER로 실행되어야 auth 스키마에 접근 가능합니다.
CREATE OR REPLACE FUNCTION public.check_email_exists(email_to_check TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS(SELECT 1 FROM auth.users WHERE email = email_to_check);
END;
$$;

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
SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, new.raw_user_meta_data->>'username');
  RETURN new;
END;
$$;

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
