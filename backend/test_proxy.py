import asyncio
import logging
from services.daangn_scraper import DaangnScraper

# 로깅 설정
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def test_proxy():
    """Oxylabs 프록시 테스트"""
    try:
        # 스크래퍼 초기화
        scraper = DaangnScraper(use_proxy=True)
        
        # 프록시 설정
        await scraper.setup_proxy()
        
        # 프록시 정보 출력
        print(f"프록시 제공자: {scraper.proxy.get('provider', '')}")
        print(f"프록시 국가: {scraper.proxy.get('country', '')}")
        print(f"프록시 주소: {scraper.proxy.get('proxy_address', '')}:{scraper.proxy.get('port', '')}")
        print(f"프록시 URL: {scraper.proxy_url}")
        
        # 검색 테스트
        print("\n검색 테스트를 시작합니다...")
        results = await scraper.search("아이폰")
        
        print(f"\n총 {len(results)}개의 결과를 찾았습니다.")
        if results:
            # 첫 번째 결과만 출력
            result = results[0]
            print(f"제목: {result['title']}")
            print(f"가격: {result['price']}")
            print(f"위치: {result['location']}")
            print(f"링크: {result['link']}")
    
    except Exception as e:
        logger.error(f"테스트 중 오류 발생: {e}")

if __name__ == "__main__":
    asyncio.run(test_proxy()) 