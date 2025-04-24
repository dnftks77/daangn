-- search_results 테이블에 dong_id 컬럼 추가 마이그레이션
ALTER TABLE search_results ADD COLUMN IF NOT EXISTS dong_id TEXT;

-- 변경 내용 확인
COMMENT ON COLUMN search_results.dong_id IS '당근마켓 지역 ID 정보'; 