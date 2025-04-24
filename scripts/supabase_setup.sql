-- 검색 요청 테이블 생성
CREATE TABLE IF NOT EXISTS search_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    query TEXT NOT NULL,
    location TEXT NOT NULL DEFAULT '전국',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 검색 결과 테이블 생성
CREATE TABLE IF NOT EXISTS search_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    search_request_id UUID REFERENCES search_requests(id) NOT NULL,
    title TEXT NOT NULL,
    price TEXT,
    reg_time TEXT,
    link TEXT UNIQUE NOT NULL,
    image_url TEXT,
    location TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 테이블이 이미 존재하는 경우를 위한 updated_at 컬럼 추가 및 link 필드에 UNIQUE 제약조건 추가
DO $$
BEGIN
    -- updated_at 컬럼이 존재하지 않는 경우에만 추가
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'search_results' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE search_results ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now() NOT NULL;
    END IF;

    -- link 필드에 UNIQUE 제약 조건이 없는 경우에만 추가
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'search_results' 
        AND constraint_type = 'UNIQUE' 
        AND constraint_name = 'search_results_link_key'
    ) THEN
        -- 기존 중복 데이터가 있을 수 있으므로, 중복을 제거한 후에 제약 조건 추가
        -- 중복된 레코드 중 가장 최근에 생성된 항목만 유지하고 나머지 삭제
        DELETE FROM search_results a
        USING (
            SELECT MAX(id) as max_id, link
            FROM search_results 
            GROUP BY link
            HAVING COUNT(*) > 1
        ) b
        WHERE a.link = b.link AND a.id != b.max_id;
        
        -- UNIQUE 제약 조건 추가
        ALTER TABLE search_results ADD CONSTRAINT search_results_link_key UNIQUE (link);
    END IF;
END
$$;

-- 인덱스 생성
-- link 인덱스 (이미 UNIQUE 제약 조건이 있으므로 인덱스가 자동 생성됨)
-- 검색 요청별 결과 조회를 위한 인덱스
CREATE INDEX IF NOT EXISTS search_results_search_request_id_idx ON search_results(search_request_id);
-- 사용자별 검색 이력 조회를 위한 인덱스
CREATE INDEX IF NOT EXISTS search_requests_user_id_idx ON search_requests(user_id);
-- 시간순 정렬을 위한 인덱스
CREATE INDEX IF NOT EXISTS search_requests_created_at_idx ON search_requests(created_at); 