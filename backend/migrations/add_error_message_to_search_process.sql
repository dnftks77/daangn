-- search_process 테이블에 error_message 컬럼 추가 마이그레이션
ALTER TABLE search_process ADD COLUMN IF NOT EXISTS error_message TEXT;

-- 기존 오류 데이터 처리 (이미 에러가 있는 레코드라면 is_completed를 False로 설정)
UPDATE search_process
SET is_completed = FALSE
WHERE items_count = 0 AND is_completed = TRUE;

-- 변경 내용 확인
COMMENT ON COLUMN search_process.error_message IS '검색 프로세스 실패 시 오류 메시지'; 