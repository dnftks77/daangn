from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
import psycopg2
import logging
import os
from dotenv import load_dotenv
from datetime import datetime

# 환경 변수 로드
load_dotenv()

# 데이터베이스 접속 정보
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "daangn_db")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")

router = APIRouter(
    prefix="/api/trend",
    tags=["trend"],
    responses={404: {"description": "Not found"}},
)

logger = logging.getLogger("trend_router")

def get_db_connection():
    """PostgreSQL 데이터베이스 연결을 반환합니다."""
    try:
        connection = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        return connection
    except Exception as e:
        logger.error(f"데이터베이스 연결 오류: {e}")
        return None

@router.get("/joongna-rankings")
async def get_joongna_rankings():
    """중고나라 인기 검색어 랭킹을 가져옵니다."""
    
    try:
        connection = get_db_connection()
        if not connection:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="데이터베이스 연결 실패"
            )
        
        cursor = connection.cursor()
        
        # 오늘 날짜 구하기
        today = datetime.now().strftime("%Y-%m-%d")
        
        # 오늘 날짜의 랭킹 데이터 중 rank 값이 낮은 순으로 중복 제거하여 가져오기
        query = """
        WITH unique_keywords AS (
            SELECT DISTINCT ON (keyword) keyword, rank
            FROM joongna_rank
            WHERE DATE(created_at) = %s
            ORDER BY keyword, rank DESC
        )
        SELECT rank, keyword
        FROM unique_keywords
        ORDER BY rank ASC;
        """
        
        cursor.execute(query, (today,))
        rankings = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        # 결과 포맷팅
        formatted_rankings = [
            {"rank": rank, "keyword": keyword} 
            for rank, keyword in rankings
        ]
        
        return {"rankings": formatted_rankings}
        
    except Exception as e:
        logger.error(f"중고나라 랭킹 조회 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"중고나라 랭킹 조회 중 오류 발생: {str(e)}"
        )

# 중고나라 랭킹 엔드포인트 삭제 