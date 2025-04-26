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

# 외부 데이터베이스 접속 정보
EXTERNAL_DB_HOST = os.getenv("EXTERNAL_DB_HOST", "34.85.3.52")
EXTERNAL_DB_PORT = os.getenv("EXTERNAL_DB_PORT", "5432")
EXTERNAL_DB_NAME = os.getenv("EXTERNAL_DB_NAME", "daangn")
EXTERNAL_DB_USER = os.getenv("EXTERNAL_DB_USER", "postgres")
EXTERNAL_DB_PASSWORD = os.getenv("EXTERNAL_DB_PASSWORD", "Daangn2024!")

# 로컬 데이터베이스 접속 정보
LOCAL_DB_HOST = os.getenv("DB_HOST", "localhost")
LOCAL_DB_PORT = os.getenv("DB_PORT", "5433")
LOCAL_DB_NAME = os.getenv("DB_NAME", "daangn_db")
LOCAL_DB_USER = os.getenv("DB_USER", "postgres")
LOCAL_DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")

def get_db_connection(is_external=True):
    """PostgreSQL 데이터베이스 연결을 반환합니다."""
    try:
        if is_external:
            connection = psycopg2.connect(
                host=EXTERNAL_DB_HOST,
                port=EXTERNAL_DB_PORT,
                database=EXTERNAL_DB_NAME,
                user=EXTERNAL_DB_USER,
                password=EXTERNAL_DB_PASSWORD
            )
            logger.info("외부 데이터베이스에 연결했습니다.")
        else:
            connection = psycopg2.connect(
                host=LOCAL_DB_HOST,
                port=LOCAL_DB_PORT,
                database=LOCAL_DB_NAME,
                user=LOCAL_DB_USER,
                password=LOCAL_DB_PASSWORD
            )
            logger.info("로컬 데이터베이스에 연결했습니다.")
        return connection
    except Exception as e:
        db_type = "외부" if is_external else "로컬"
        logger.error(f"{db_type} 데이터베이스 연결 오류: {e}")
        return None

def create_table_if_not_exists(is_external=True):
    """joongna_rank 테이블이 없으면 생성합니다."""
    connection = get_db_connection(is_external)
    if not connection:
        return False
    
    db_type = "외부" if is_external else "로컬"
    
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
            
            logger.info(f"{db_type} 데이터베이스에 joongna_rank 테이블을 생성했습니다.")
        
        connection.commit()
        return True
    
    except Exception as e:
        logger.error(f"{db_type} 데이터베이스 테이블 생성 오류: {e}")
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

def save_rankings_to_db(rankings, is_external=True):
    """크롤링한 순위 데이터를 데이터베이스에 저장합니다.
    중복 데이터(동일 날짜, 동일 키워드)는 스킵하거나 순위가 더 높은 경우에만 업데이트합니다.
    """
    if not rankings:
        logger.warning("저장할 순위 데이터가 없습니다.")
        return False
    
    connection = get_db_connection(is_external)
    if not connection:
        return False
    
    db_type = "외부" if is_external else "로컬"
    
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
                    logger.info(f"{db_type} DB: 레코드 업데이트: 키워드 '{rank_data['keyword']}', 순위 {current_rank} -> {rank_data['rank']}")
                else:
                    skipped_count += 1
                    logger.info(f"{db_type} DB: 중복 레코드 스킵: 키워드 '{rank_data['keyword']}', 현재 순위 {current_rank}")
            else:
                # 새 레코드 삽입
                cursor.execute(
                    "INSERT INTO joongna_rank (rank, keyword) VALUES (%s, %s)",
                    (rank_data["rank"], rank_data["keyword"])
                )
                inserted_count += 1
                logger.info(f"{db_type} DB: 새 레코드 삽입: 키워드 '{rank_data['keyword']}', 순위 {rank_data['rank']}")
        
        # 정리 함수 실행 시도
        try:
            cursor.execute("SELECT cleanup_joongna_rank()")
            logger.info(f"{db_type} DB: cleanup_joongna_rank 함수 실행 완료")
        except Exception as e:
            logger.warning(f"{db_type} DB: cleanup_joongna_rank 함수 실행 오류 (무시하고 진행): {e}")
        
        connection.commit()
        logger.info(f"{db_type} DB 저장 완료: {inserted_count}개 삽입, {updated_count}개 업데이트, {skipped_count}개 스킵")
        return True
    
    except Exception as e:
        logger.error(f"{db_type} DB 저장 오류: {e}")
        connection.rollback()
        return False
    
    finally:
        if connection:
            connection.close()

def main():
    """메인 함수: 크롤링 및 DB 저장을 실행합니다."""
    # 외부 DB 테이블 생성 확인
    if not create_table_if_not_exists(is_external=True):
        logger.error("외부 DB 테이블 생성 실패, 계속 진행합니다.")
    
    # 로컬 DB 테이블 생성 확인
    if not create_table_if_not_exists(is_external=False):
        logger.error("로컬 DB 테이블 생성 실패, 계속 진행합니다.")
    
    # 크롤링 실행
    rankings = joongna_crawl()
    
    if not rankings:
        logger.error("중고나라 인기 검색어 크롤링에 실패했습니다.")
        return
    
    # 외부 DB 저장
    external_success = save_rankings_to_db(rankings, is_external=True)
    
    # 로컬 DB 저장
    local_success = save_rankings_to_db(rankings, is_external=False)
    
    if external_success and local_success:
        logger.info("중고나라 인기 검색어 크롤링 및 양쪽 DB 저장이 완료되었습니다.")
    elif external_success:
        logger.warning("중고나라 인기 검색어 외부 DB 저장만 성공했습니다.")
    elif local_success:
        logger.warning("중고나라 인기 검색어 로컬 DB 저장만 성공했습니다.")
    else:
        logger.error("중고나라 인기 검색어 양쪽 DB 저장 모두 실패했습니다.")

if __name__ == "__main__":
    main() 