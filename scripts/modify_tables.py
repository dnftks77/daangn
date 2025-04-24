from sqlalchemy import create_engine, text
import os

# Database connection settings
DB_HOST = os.environ.get('DB_HOST', 'localhost')
DB_PORT = os.environ.get('DB_PORT', '5432')
DB_USER = os.environ.get('DB_USER', 'postgres')
DB_PASSWORD = os.environ.get('DB_PASSWORD', 'postgres')
DB_NAME = os.environ.get('DB_NAME', 'daangn_db')

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

def main():
    # Create engine
    print(f"데이터베이스 연결: {DATABASE_URL}")
    engine = create_engine(DATABASE_URL)
    
    # 테이블 변경
    print("테이블 구조 변경 시작...")
    
    with engine.connect() as conn:
        # search_results 테이블에 search_request_user 컬럼 추가
        print("1. search_results 테이블에 search_request_user 컬럼 추가...")
        conn.execute(text("""
        ALTER TABLE search_results
        ADD COLUMN search_request_user UUID REFERENCES users(id);
        """))
        
        # 데이터 마이그레이션: search_request_id로부터 user_id 데이터 복사
        print("2. 기존 search_request_id의 사용자 정보를 search_request_user로 마이그레이션...")
        conn.execute(text("""
        UPDATE search_results sr
        SET search_request_user = (
            SELECT user_id 
            FROM search_requests 
            WHERE id = sr.search_request_id
        )
        WHERE sr.search_request_id IS NOT NULL;
        """))
        
        # 외래 키 제약조건 제거 (있는 경우)
        print("3. 기존 외래 키 제약조건 제거...")
        conn.execute(text("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.table_constraints 
                WHERE constraint_name = 'search_results_search_request_id_fkey'
                AND table_name = 'search_results'
            ) THEN
                ALTER TABLE search_results 
                DROP CONSTRAINT search_results_search_request_id_fkey;
            END IF;
        END $$;
        """))
        
        # search_request_id 컬럼은 일단 유지 (기존 코드가 사용할 수 있으므로)
        # 필요시 나중에 제거
        
        conn.commit()
    
    print("테이블 구조 변경 완료.")

if __name__ == "__main__":
    main() 