-- 기존 image_url 필드명을 thumbnail로 변경
ALTER TABLE search_results RENAME COLUMN image_url TO thumbnail;

-- price 필드를 숫자 타입으로 변경
-- 먼저 임시 열을 추가하고, 데이터 변환 후 원래 열을 대체
ALTER TABLE search_results ADD COLUMN price_numeric NUMERIC;

-- 데이터 변환: price 문자열에서 숫자 부분만 추출하여 price_numeric에 저장
-- '₩' 기호, 쉼표, 공백 등을 제거하고 숫자만 추출
UPDATE search_results
SET price_numeric = 
  CASE 
    WHEN price ~ E'^[0-9]+(\\.)?[0-9]*$' THEN price::NUMERIC
    WHEN price ~ E'^[^0-9]*([0-9]+)[^0-9]*$' THEN (regexp_match(price, E'([0-9]+)'))[1]::NUMERIC
    ELSE NULL
  END;

-- 기존 price 컬럼 삭제
ALTER TABLE search_results DROP COLUMN price;

-- price_numeric 컬럼을 price로 이름 변경
ALTER TABLE search_results RENAME COLUMN price_numeric TO price;

-- 새 필드 추가
ALTER TABLE search_results ADD COLUMN status TEXT;
ALTER TABLE search_results ADD COLUMN content TEXT;
ALTER TABLE search_results ADD COLUMN nickname TEXT;
ALTER TABLE search_results ADD COLUMN created_at_origin TIMESTAMPTZ;
ALTER TABLE search_results ADD COLUMN boosted_at TIMESTAMPTZ;

-- reg_time 필드 삭제
ALTER TABLE search_results DROP COLUMN reg_time;

-- nickname_id 필드 추가
ALTER TABLE search_results ADD COLUMN nickname_id TEXT;

-- category 필드 추가
ALTER TABLE search_results ADD COLUMN category TEXT; 