#!/usr/bin/env python3

import time
import os
import sys
import psycopg2
import logging
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from bs4 import BeautifulSoup
from dotenv import load_dotenv

# 로그 설정
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# 환경 변수 로드
load_dotenv()

# 데이터베이스 접속 정보
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "daangn_db")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")

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

def create_table_if_not_exists():
    """joongna_rank 테이블이 없으면 생성합니다."""
    connection = get_db_connection()
    if not connection:
        return False
    
    try:
        cursor = connection.cursor()
        
        # 테이블 존재 여부 확인
        cursor.execute("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'joongna_rank'
        );
        """)
        
        table_exists = cursor.fetchone()[0]
        
        if not table_exists:
            # 테이블 생성
            cursor.execute("""
            CREATE TABLE joongna_rank (
                id SERIAL PRIMARY KEY,
                rank INTEGER NOT NULL,
                keyword TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """)
            
            logger.info("joongna_rank 테이블을 생성했습니다.")
        
        connection.commit()
        return True
    
    except Exception as e:
        logger.error(f"테이블 생성 오류: {e}")
        connection.rollback()
        return False
    
    finally:
        if connection:
            connection.close()


def joongna_crawl():
    """중고나라 인기 검색어 크롤링"""
    logger.info("중고나라 인기 검색어 크롤링을 시작합니다.")
    
    # 크롬 옵션 설정
    chrome_options = Options()
    chrome_options.add_argument("--headless")  # 헤드리스 모드 (화면 표시 없음)
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    
    # 웹드라이버 초기화
    driver = None
    
    try:
        driver = webdriver.Chrome(options=chrome_options)
        
        # 중고나라 사이트 접속
        url = "https://web.joongna.com/signin?type=default"
        logger.info(f"URL에 접속 중: {url}")
        driver.get(url)
        
        # JavaScript 로딩을 위해 3초 대기
        logger.info("JavaScript 로딩을 위해 3초 대기 중...")
        time.sleep(3)
        
        # 페이지 소스 가져오기
        page_source = driver.page_source
        
        # BeautifulSoup으로 파싱
        soup = BeautifulSoup(page_source, "html.parser")
        
        # 인기 검색어 찾기
        rankings = []
        keyword_items = soup.select("li.break-keep.truncate.max-w-\\[160px\\]")
        
        if keyword_items:
            logger.info(f"총 {len(keyword_items)}개의 인기 검색어를 찾았습니다.")
            for item in keyword_items:
                link = item.find('a')
                if link:
                    rank_span = link.find('span', class_='font-semibold')
                    if rank_span:
                        rank_text = rank_span.text.strip()
                        # 숫자와 점 제거하여 순위 추출 (예: "1. " -> 1)
                        rank = int(rank_text.replace(".", "").strip())
                        # 키워드 텍스트 추출 (rank_text를 제거한 나머지)
                        keyword = link.text.replace(rank_text, '').strip()
                        
                        rankings.append({
                            "rank": rank,
                            "keyword": keyword
                        })
                        logger.info(f"순위: {rank}, 키워드: {keyword}")
        else:
            logger.warning("인기 검색어를 찾을 수 없습니다.")
            
            # 디버깅을 위해 HTML 저장
            debug_file = "joongna_debug.html"
            with open(debug_file, "w", encoding="utf-8") as f:
                f.write(page_source)
            
            logger.info(f"디버깅을 위해 HTML을 '{debug_file}'에 저장했습니다.")
        
        return rankings
    
    except Exception as e:
        logger.error(f"크롤링 오류: {e}")
        return []
    
    finally:
        if driver:
            driver.quit()

def save_rankings_to_db(rankings):
    """크롤링한 순위 데이터를 데이터베이스에 저장합니다.
    중복 데이터(동일 날짜, 동일 키워드)는 스킵하거나 순위가 더 높은 경우에만 업데이트합니다.
    """
    if not rankings:
        logger.warning("저장할 순위 데이터가 없습니다.")
        return False
    
    connection = get_db_connection()
    if not connection:
        return False
    
    try:
        cursor = connection.cursor()
        
        # 오늘 날짜 (시간 제외)
        today_date = datetime.now().strftime('%Y-%m-%d')
        
        # 순위 데이터 저장 (중복 체크 및 업데이트 로직 포함)
        inserted_count = 0
        updated_count = 0
        skipped_count = 0
        
        for rank_data in rankings:
            # 동일 날짜, 동일 키워드 검사
            cursor.execute(
                """
                SELECT id, rank FROM joongna_rank 
                WHERE keyword = %s AND DATE(created_at) = %s
                """,
                (rank_data["keyword"], today_date)
            )
            
            existing_record = cursor.fetchone()
            
            if existing_record:
                # 기존 레코드 존재: 순위가 더 큰 경우에만 업데이트
                record_id, current_rank = existing_record
                if rank_data["rank"] > current_rank:
                    cursor.execute(
                        "UPDATE joongna_rank SET rank = %s WHERE id = %s",
                        (rank_data["rank"], record_id)
                    )
                    updated_count += 1
                    logger.info(f"레코드 업데이트: 키워드 '{rank_data['keyword']}', 순위 {current_rank} -> {rank_data['rank']}")
                else:
                    skipped_count += 1
                    logger.info(f"중복 레코드 스킵: 키워드 '{rank_data['keyword']}', 현재 순위 {current_rank}")
            else:
                # 새 레코드 삽입
                cursor.execute(
                    "INSERT INTO joongna_rank (rank, keyword) VALUES (%s, %s)",
                    (rank_data["rank"], rank_data["keyword"])
                )
                inserted_count += 1
                logger.info(f"새 레코드 삽입: 키워드 '{rank_data['keyword']}', 순위 {rank_data['rank']}")
        
        # 정리 함수 실행
        cursor.execute("SELECT cleanup_joongna_rank()")
        
        connection.commit()
        logger.info(f"순위 데이터 저장 완료: {inserted_count}개 삽입, {updated_count}개 업데이트, {skipped_count}개 스킵")
        return True
    
    except Exception as e:
        logger.error(f"데이터베이스 저장 오류: {e}")
        connection.rollback()
        return False
    
    finally:
        if connection:
            connection.close()

def main():
    """메인 함수: 크롤링 및 DB 저장을 실행합니다."""
    # 테이블 생성 확인
    if not create_table_if_not_exists():
        logger.error("테이블 생성 실패, 종료합니다.")
        return
    
    # 크롤링 실행
    rankings = joongna_crawl()
    
    # DB 저장
    if rankings:
        success = save_rankings_to_db(rankings)
        if success:
            logger.info("중고나라 인기 검색어 크롤링 및 저장이 완료되었습니다.")
        else:
            logger.error("중고나라 인기 검색어 저장에 실패했습니다.")
    else:
        logger.error("중고나라 인기 검색어 크롤링에 실패했습니다.")

if __name__ == "__main__":
    main() 