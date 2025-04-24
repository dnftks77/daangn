import os
import sys
from dotenv import load_dotenv
from supabase import create_client

# 환경 변수 로드
load_dotenv()

# Supabase 연결 정보
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")  # 테이블 생성에는 서비스 키가 필요합니다

if not supabase_url or not supabase_key:
    print("Error: SUPABASE_URL 또는 SUPABASE_SERVICE_KEY가 설정되지 않았습니다.")
    sys.exit(1)

# Supabase 클라이언트 생성
supabase = create_client(supabase_url, supabase_key)

# 테이블 생성 SQL
create_search_requests_table = """
CREATE TABLE IF NOT EXISTS search_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    query TEXT NOT NULL,
    location TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
"""

create_search_results_table = """
CREATE TABLE IF NOT EXISTS search_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    search_request_id UUID REFERENCES search_requests(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    price TEXT NOT NULL,
    reg_time TEXT NOT NULL,
    link TEXT NOT NULL,
    image_url TEXT,
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
"""

# SQL 실행 함수
def execute_sql(sql, description):
    try:
        # Supabase에서는 직접 SQL을 실행할 수 있는 REST API를 제공하지 않으므로
        # 데이터 API를 통해 우회합니다
        # 실제로는 Supabase 대시보드나 SQL 편집기에서 이 SQL을 실행해야 합니다
        response = supabase.rpc('exec_sql', {'query': sql}).execute()
        print(f"{description} 성공!")
        return True
    except Exception as e:
        print(f"{description} 실패: {str(e)}")
        return False

# 메인 실행
if __name__ == "__main__":
    print("Supabase 테이블 생성 시작...")
    
    # 저장 프로시저 생성 (SQL 실행용)
    create_exec_sql_function = """
    CREATE OR REPLACE FUNCTION exec_sql(query text)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
        EXECUTE query;
    END;
    $$;
    """
    
    # SQL 실행
    execute_sql(create_exec_sql_function, "exec_sql 함수 생성")
    execute_sql(create_search_requests_table, "검색 요청 테이블 생성")
    execute_sql(create_search_results_table, "검색 결과 테이블 생성")
    
    print("테이블 생성이 완료되었습니다!") 