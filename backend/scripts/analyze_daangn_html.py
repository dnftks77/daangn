import requests
from bs4 import BeautifulSoup
import json
import os
import sys

def analyze_daangn_html(search_term="닌텐도", location="송도1동-887"):
    """당근마켓 검색 결과 페이지의 HTML 구조를 분석합니다."""
    
    # 검색 URL 구성
    url = f"https://www.daangn.com/kr/buy-sell/?in={location}&search={search_term}"
    
    # User-Agent 설정
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    }
    
    try:
        # 검색 페이지 요청
        print(f"URL 요청 중: {url}")
        response = requests.get(url, headers=headers)
        
        if response.status_code != 200:
            print(f"오류 발생: HTTP 상태 코드 {response.status_code}")
            return None
        
        # HTML 저장
        with open("daangn_search_result.html", "w", encoding="utf-8") as f:
            f.write(response.text)
        print(f"HTML이 'daangn_search_result.html' 파일로 저장되었습니다.")
        
        # BeautifulSoup으로 HTML 파싱
        soup = BeautifulSoup(response.text, "html.parser")
        
        # 검색 결과 아이템 찾기
        items = soup.select('a[data-gtm="search_article"]')
        print(f"총 {len(items)}개의 검색 결과를 찾았습니다.")
        
        # 검색 결과 파싱 및 분석
        results = []
        for i, item in enumerate(items[:5]):  # 처음 5개 항목만 상세 분석
            try:
                link = item.get('href', '')
                
                # CSS 선택자 실험
                selectors_to_try = {
                    "제목 선택자": [
                        ".sprinkles_overflow_hidden__1byufe819.lm809sh",
                        ".lm809sh.sprinkles_overflow_hidden__1byufe819",
                        "span.lm809sh"
                    ],
                    "가격 선택자": [
                        ".sprinkles_fontWeight_bold__1byufe81z",
                        ".lm809si.sprinkles_fontWeight_bold__1byufe81z",
                        "span.lm809si"
                    ],
                    "시간 선택자": [
                        "time.lm809sj",
                        "time.sprinkles_overflow_hidden__1byufe819",
                        "time"
                    ],
                    "이미지 선택자": [
                        "img.lm809sg",
                        "img.sprinkles_width_full_base__1byufe84q",
                        "img"
                    ],
                    "위치 선택자": [
                        ".lm809sj.sprinkles_overflow_hidden__1byufe819",
                        "span.lm809sj",
                        ".sprinkles_overflow_hidden__1byufe819:not(time)"
                    ]
                }

                item_data = {
                    "link": link,
                    "selector_results": {},
                    "raw_html": str(item)[:500] + "..." if len(str(item)) > 500 else str(item)  # 일부만 저장
                }
                
                # 여러 선택자 시도
                for selector_name, selector_list in selectors_to_try.items():
                    for selector in selector_list:
                        element = item.select_one(selector)
                        if element:
                            item_data["selector_results"][selector_name] = {
                                "selector": selector,
                                "text": element.text.strip(),
                                "raw_html": str(element)[:200] + "..." if len(str(element)) > 200 else str(element)
                            }
                            break
                
                results.append(item_data)
                
                print(f"\n--- 결과 {i+1} ---")
                print(f"링크: {link}")
                for selector_name, result in item_data["selector_results"].items():
                    print(f"{selector_name}: {result['text']} (선택자: {result['selector']})")
                
            except Exception as e:
                print(f"항목 {i+1} 파싱 중 오류 발생: {e}")
        
        # 결과를 JSON 파일로 저장
        with open("daangn_search_analysis.json", "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        print(f"\n분석 결과가 'daangn_search_analysis.json' 파일로 저장되었습니다.")
        
        # 가장 효과적인 선택자 추천
        recommend_selectors(results)
        
        return results
    
    except Exception as e:
        print(f"오류 발생: {str(e)}")
        return None

def recommend_selectors(results):
    """분석 결과를 바탕으로 가장 효과적인 선택자를 추천합니다."""
    if not results:
        return
    
    selector_counts = {
        "제목 선택자": {},
        "가격 선택자": {},
        "시간 선택자": {},
        "이미지 선택자": {},
        "위치 선택자": {}
    }
    
    # 각 선택자 유형별로 성공적인 선택자 카운트
    for item in results:
        for selector_type, result in item.get("selector_results", {}).items():
            selector = result.get("selector")
            if selector:
                selector_counts[selector_type][selector] = selector_counts[selector_type].get(selector, 0) + 1
    
    print("\n--- 추천 선택자 ---")
    recommended = {}
    for selector_type, counts in selector_counts.items():
        if counts:
            best_selector = max(counts.items(), key=lambda x: x[1])
            recommended[selector_type] = best_selector[0]
            print(f"{selector_type}: {best_selector[0]} (성공률: {best_selector[1]}/{len(results)})")
    
    # 추천 선택자를 JSON 파일로 저장
    with open("recommended_selectors.json", "w", encoding="utf-8") as f:
        json.dump(recommended, f, ensure_ascii=False, indent=2)
    print(f"추천 선택자가 'recommended_selectors.json' 파일로 저장되었습니다.")

if __name__ == "__main__":
    search_term = "닌텐도"
    if len(sys.argv) > 1:
        search_term = sys.argv[1]
    
    print(f"'{search_term}' 검색 결과 분석 시작...")
    analyze_daangn_html(search_term) 