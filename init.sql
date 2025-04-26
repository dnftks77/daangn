-- PostgreSQL 초기화 스크립트
-- daangn_db 데이터베이스에 필요한 초기 스키마 및 테이블 설정

-- 이미 존재하는 테이블이 있다면 삭제
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- 카테고리 테이블 생성
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 사용자 테이블 생성
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  profile_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 제품 테이블 생성
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  seller_id INTEGER REFERENCES users(id),
  category_id INTEGER REFERENCES categories(id),
  image_url TEXT[],
  location VARCHAR(100),
  status VARCHAR(20) DEFAULT 'available',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 기본 카테고리 데이터 추가
INSERT INTO categories (name) VALUES 
  ('디지털/가전'),
  ('가구/인테리어'),
  ('유아동/유아도서'),
  ('생활/가공식품'),
  ('스포츠/레저'),
  ('여성의류'),
  ('남성의류'),
  ('게임/취미'),
  ('뷰티/미용'),
  ('반려동물'),
  ('도서/티켓/음반'),
  ('식물');

-- 권한 설정
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres; 