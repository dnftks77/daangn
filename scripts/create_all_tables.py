import os
import sys
from sqlalchemy import create_engine, text

# 상위 디렉토리를 파이썬 경로에 추가
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

# 백엔드 모듈에서 모델 클래스 및 Base 임포트
from backend.services.db_service import Base, User, SearchRequest, SearchResult, SearchProcess, PlaceList

def main():
    # 환경에 따른 데이터베이스 연결 정보 설정
    ENV = os.getenv("ENV", "production")
    
    if ENV == "production":
        # GCP Cloud SQL 설정
        DB_HOST = os.getenv("DB_HOST", "34.85.3.52")
        DB_PORT = os.getenv("DB_PORT", "5432")
        DB_USER = os.getenv("DB_USER", "daangn-user")
        DB_PASSWORD = os.getenv("DB_PASSWORD", "daangn-user-pw-2024")
        DB_NAME = os.getenv("DB_NAME", "daangn")
    else:
        # 로컬 개발 환경 설정
        DB_HOST = os.getenv("DB_HOST", "localhost")
        DB_PORT = os.getenv("DB_PORT", "5432")
        DB_USER = os.getenv("DB_USER", "postgres")
        DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")
        DB_NAME = os.getenv("DB_NAME", "daangn_db")

    # 데이터베이스 연결 문자열
    DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    
    # SQLAlchemy 엔진 생성
    print(f"Connecting to database: {DATABASE_URL}")
    engine = create_engine(DATABASE_URL)
    
    # 모든 테이블 생성
    print("Creating all tables based on SQLAlchemy models...")
    Base.metadata.create_all(engine)
    print("Tables created successfully!")
    
    # 예제 관리자 계정 생성
    with engine.connect() as conn:
        # 관리자 계정이 이미 존재하는지 확인
        result = conn.execute(text("SELECT COUNT(*) FROM users WHERE username = 'admin'")).fetchone()
        if result[0] == 0:
            from passlib.context import CryptContext
            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
            
            # 비밀번호 해싱
            hashed_password = pwd_context.hash("admin123")
            
            # 관리자 계정 생성
            conn.execute(text("""
            INSERT INTO users (id, username, password, is_admin, created_at) 
            VALUES (gen_random_uuid(), 'admin', :password, TRUE, CURRENT_TIMESTAMP)
            """), {"password": hashed_password})
            
            conn.commit()
            print("Admin account created: username='admin', password='admin123'")
        else:
            print("Admin account already exists")

if __name__ == "__main__":
    main() 