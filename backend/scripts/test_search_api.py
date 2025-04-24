#!/usr/bin/env python3
import requests
import json
import os
import sys
from dotenv import load_dotenv
import time

# 환경 변수 로드
load_dotenv()

def test_search_api(query="닌텐도", api_url=None):
    """
    FastAPI 검색 API를 테스트합니다.
    """
    if not api_url:
        # 도커 환경에서는 localhost가 아닌 서비스 이름 사용
        api_url = os.getenv("API_URL", "http://backend:8000")
    
    print(f"API URL: {api_url}")
    search_endpoint = f"{api_url}/api/search"
    
    print(f"\n{'='*50}")
    print(f"검색 API 테스트: '{query}'")
    print(f"{'='*50}")
    
    # 1. 서버 상태 확인
    try:
        health_response = requests.get(f"{api_url}/health")
        if health_response.status_code != 200:
            print(f"서버가 응답하지 않습니다. 상태 코드: {health_response.status_code}")
            return False
        print("✓ 서버가 정상적으로 응답합니다.")
    except Exception as e:
        print(f"서버 연결 오류: {str(e)}")
        return False
    
    # 2. 검색 API 호출
    try:
        print(f"\n[1] 검색 요청 전송 중...")
        start_time = time.time()
        search_response = requests.post(
            search_endpoint,
            json={"query": query, "location": "송도1동-887"}
        )
        elapsed_time = time.time() - start_time
        
        if search_response.status_code != 200:
            print(f"검색 API 오류: 상태 코드 {search_response.status_code}")
            print(search_response.text)
            return False
        
        result = search_response.json()
        print(f"✓ 검색 API 응답 성공! (소요 시간: {elapsed_time:.2f}초)")
        print(f"✓ 검색된 결과: {result.get('count', 0)}개 항목")
        
        # 2.1 검색 결과 출력
        print(f"\n[2] 검색 결과:")
        if result.get('count', 0) > 0:
            for i, item in enumerate(result.get('results', [])):
                if i >= 5:  # 최대 5개만 표시
                    print(f"... 외 {result.get('count') - 5}개 항목")
                    break
                print(f"\n--- 항목 {i+1} ---")
                print(f"제목: {item.get('title')}")
                print(f"가격: {item.get('price')}")
                print(f"등록시간: {item.get('reg_time')}")
                print(f"위치: {item.get('location')}")
        else:
            print("검색 결과가 없습니다.")
        
        # 3. 검색 결과를 JSON 파일로 저장
        with open(f"search_result_{query}.json", "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"\n✓ 검색 결과가 'search_result_{query}.json' 파일로 저장되었습니다.")
        
        # 4. 최근 검색 내역 확인
        print(f"\n[3] 최근 검색 내역 확인 중...")
        recent_response = requests.get(f"{search_endpoint}/recent")
        
        if recent_response.status_code != 200:
            print(f"최근 검색 내역 API 오류: 상태 코드 {recent_response.status_code}")
        else:
            recent_searches = recent_response.json()
            print(f"✓ 최근 검색 내역: {len(recent_searches)}개")
            
            if len(recent_searches) > 0:
                for i, search in enumerate(recent_searches[:3]):  # 최대 3개만 표시
                    print(f"  {i+1}. 검색어: '{search.get('query')}' ({search.get('created_at', '').split('T')[0]})")
            
            # 최근 검색 중 가장 최근 항목의 결과 확인
            if len(recent_searches) > 0:
                search_id = recent_searches[0].get('id')
                print(f"\n[4] 검색 ID '{search_id}'의 결과 확인 중...")
                
                results_response = requests.get(f"{search_endpoint}/results/{search_id}")
                if results_response.status_code != 200:
                    print(f"검색 결과 조회 API 오류: 상태 코드 {results_response.status_code}")
                else:
                    search_results = results_response.json()
                    print(f"✓ 검색 결과: {len(search_results)}개 항목")
        
        return True
    
    except Exception as e:
        print(f"검색 API 테스트 중 오류: {str(e)}")
        return False

if __name__ == "__main__":
    search_query = "닌텐도"
    
    # 명령행 인수로 검색어를 받을 수 있음
    if len(sys.argv) > 1:
        search_query = sys.argv[1]
    
    success = test_search_api(search_query)
    sys.exit(0 if success else 1) 