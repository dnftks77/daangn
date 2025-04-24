from models import SearchRequest, SearchResultItem
from services.db_service import DBService
import asyncio

async def test_search():
    db = DBService()
    result = await db.get_search_results('d2906212-ac48-43a5-9e50-82d89f2a4c24', page=1, page_size=5)
    print(f'총 결과 수: {result["total"]}')
    
    # 카테고리별 아이템 수 출력
    for key, value in result.items():
        if key.startswith('total_category_'):
            print(f'{key}: {value}')
    
    # 첫 번째 아이템의 카테고리 ID 확인
    if result["items"]:
        item = result["items"][0]
        print(f'첫번째 아이템 카테고리 ID: {item.get("category_id")}')
        print(f'첫번째 아이템 제목: {item.get("title")}')
    else:
        print("결과가 없습니다.")

if __name__ == "__main__":
    asyncio.run(test_search()) 