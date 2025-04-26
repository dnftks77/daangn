#!/usr/bin/env python3
# 데이터베이스 초기화 스크립트

from services.db_service import Base, engine, logger

def init_database():
    """데이터베이스 테이블을 초기화합니다."""
    try:
        logger.info("데이터베이스 테이블 생성 시작...")
        Base.metadata.create_all(engine)
        logger.info("데이터베이스 테이블 생성 완료!")
        return True
    except Exception as e:
        logger.error(f"테이블 생성 중 오류 발생: {str(e)}")
        return False

if __name__ == "__main__":
    # 스크립트로 실행될 때만 데이터베이스 초기화 실행
    init_database() 