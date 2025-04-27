from fastapi import APIRouter, Depends, HTTPException, status, Header, BackgroundTasks, Query
from typing import Optional, Dict, List
import logging
import uuid
import asyncio
import aiohttp
import time
import random  # 무작위 셔플을 위해 추가
from asyncio import gather

from models import SearchRequest, SearchResponse, SearchResultItem, User
from services.daangn_scraper import DaangnScraper
from services.db_service import DBService
from auth_utils import verify_token

# 로깅 설정
logger = logging.getLogger(__name__)

# 라우터 설정
router = APIRouter(
    prefix="/api/search",
    tags=["검색"],
    responses={404: {"description": "Not found"}},
)

# DB 서비스 인스턴스
db_service = DBService()

# 당근마켓 스크래퍼 인스턴스 (초기화만 - 실제 검색에는 사용하지 않음)
daangn_scraper = None

# 처리 중인 모든 백그라운드 태스크 추적
running_tasks = set()

# 최대 동시 비동기 요청 수를 20개로 제한하는 전역 세마포어
MAX_CONCURRENT_REQUESTS = 20
request_semaphore = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)

# 현재 진행 중인 검색 쿼리 추적 (query_text: search_request_id)
active_searches = {}
# 진행 중인 검색 쿼리를 위한 락
active_searches_lock = asyncio.Lock()

async def perform_area_search(scraper: DaangnScraper, search_request_id: str, query: str, place_param: Dict):
    """백그라운드에서 특정 지역의 검색을 수행합니다"""
    # 세마포어 획득 (함수가 호출되는 시점에 세마포어가 이미 획득되어 있음)
    process = None
    try:
        # 검색 프로세스 생성 (start_time 없이)
        process = await db_service.create_search_process(
            search_request_id=search_request_id,
            place_id=place_param["id"],
            param=place_param["param"],
            query=query,
            proxy_info=scraper.proxy if scraper.proxy else None
        )
        
        if not process:
            logger.error(f"검색 프로세스 생성 실패: {place_param['param']}")
            return
        
        process_id = process["id"]
        
        # 검색 수행 (지역만 업데이트하여 동일한 스크래퍼 사용)
        scraper.location = place_param["param"]
        logger.info(f"지역 '{place_param['param']}' 검색 시작 - 쿼리: '{query}'")
        
        # 프록시 순환 횟수 추적
        proxy_rotation_count = 0
        max_proxy_rotations = len(scraper.proxy_service.all_proxies) * 2  # 모든 프록시 2회 순환까지 시도 (무한 루프 방지)
        
        while proxy_rotation_count < max_proxy_rotations:
            try:
                # 실제 검색 시작 시간 기록
                await db_service.mark_search_process_started(process_id, scraper.proxy)
                
                # 검색 시도
                search_results = await scraper.search(query)
                
                # 검색 성공적으로 완료된 경우
                logger.info(f"지역 '{place_param['param']}' 검색 결과: {len(search_results)}개 항목")
                
                # 결과 저장
                await db_service.save_search_results(
                    search_request_id=search_request_id,
                    results=search_results,
                    query=query
                )
                
                # 검색 프로세스 완료 상태 업데이트 (성공)
                await db_service.update_search_process(
                    process_id=process_id,
                    is_completed=True,
                    items_count=len(search_results),
                    proxy_info=scraper.proxy
                )
                
                logger.info(f"지역 '{place_param['param']}' 검색 완료 (성공)")
                return  # 성공하면 종료
                
            except Exception as search_error:
                # 검색 시도 실패
                error_msg = str(search_error)
                logger.error(f"지역 '{place_param['param']}' 검색 중 오류 발생 (프록시 #{proxy_rotation_count+1}): {error_msg}")
                
                # 다음 프록시로 전환 시도
                proxy_rotation_count += 1
                logger.info(f"다음 프록시로 전환 시도 중... (시도 {proxy_rotation_count}/{max_proxy_rotations})")
                
                if await scraper.switch_to_next_proxy():
                    logger.info(f"새 프록시로 전환 성공. 검색 재시도... (프록시 정보: {scraper.proxy.get('provider', '')}/{scraper.proxy.get('country', '')})")
                    # 루프 계속 (다음 반복에서 재시도)
                    continue
                else:
                    # 프록시 전환 실패 (더 이상 프록시가 없음)
                    logger.error(f"다음 프록시로 전환 실패. 남은 사용 가능한 프록시가 없습니다.")
                    break  # while 루프 종료
        
        # 모든 프록시 시도 후에도 실패한 경우
        if proxy_rotation_count >= max_proxy_rotations or proxy_rotation_count > 0:
            logger.error(f"지역 '{place_param['param']}' 검색 실패: 모든 가능한 프록시 ({proxy_rotation_count}개) 시도 후 실패")
            
            # 프로세스를 실패로 표시 (end_time은 설정되지 않음)
            await db_service.update_search_process(
                process_id=process_id,
                is_completed=False,
                items_count=0,
                error_message=f"모든 프록시 시도 후 실패 ({proxy_rotation_count}회 시도)",
                proxy_info=scraper.proxy
            )
            
    except Exception as e:
        error_msg = str(e)
        logger.error(f"지역 검색 전체 처리 중 오류 발생: {error_msg}")
        
        # 오류 발생 시에도 프로세스 상태 업데이트 (실패로 표시)
        if process and "id" in process:
            try:
                await db_service.update_search_process(
                    process_id=process["id"],
                    is_completed=False,  # 실패로 표시 (완료되지 않음)
                    items_count=0,
                    error_message=f"처리 오류: {error_msg}",  # 오류 메시지 저장
                    proxy_info=scraper.proxy if scraper and hasattr(scraper, 'proxy') else None
                )
                logger.info(f"지역 '{place_param['param']}' 검색 실패로 기록됨 (전체 처리 오류)")
            except Exception as update_error:
                logger.error(f"실패한 프로세스 상태 업데이트 중 오류: {str(update_error)}")

@router.post("/", response_model=List[SearchResultItem])
async def search_products(
    search_request: SearchRequest,
    background_tasks: BackgroundTasks,
    user_data: Optional[Dict] = Depends(verify_token)
):
    """상품 검색 API - 당근마켓에서 상품을 검색합니다"""
    query = search_request.query.strip().lower()  # 쿼리 정규화 (소문자 변환, 공백 제거)
    logger.info(f"검색 요청 수신: {query}")
    
    # 이미 진행 중인 검색인지 확인
    async with active_searches_lock:
        if query in active_searches:
            existing_search_id = active_searches[query]
            logger.info(f"이미 진행 중인 검색 감지: 쿼리='{query}', 검색 ID={existing_search_id}")
            
            # 이미 진행 중인 검색의 상태 확인
            status = await db_service.get_search_process_status(existing_search_id)
            
            # 해당 검색 ID로 초기 결과 가져오기
            results = await db_service.get_search_results(
                search_request_id=existing_search_id,
                page=1,
                page_size=100,
                sort_by="created_at_desc",
                only_available=False
            )
            
            logger.info(f"이미 진행 중인 검색 결과 반환: {len(results['items'])}개 항목, 진행률 {status['percentage']}%")
            
            # 결과 변환 및 반환
            response_items = [
                SearchResultItem(
                    title=item["title"],
                    price=item["price"],
                    link=item["link"],
                    location=item["location"],
                    content=item.get("content", ""),
                    thumbnail=item.get("thumbnail", ""),
                    created_at_origin=item.get("created_at_origin", ""),
                    boosted_at=item.get("boosted_at", ""),
                    nickname=item.get("nickname", ""),
                    status=item.get("status", ""),
                    category_id=item.get("category_id"),
                    is_new=item.get("is_new", False),
                    dong_id=item.get("dong_id"),
                    place_title_original=item.get("place_title_original"),
                    sido=item.get("sido"),
                    sigungu1=item.get("sigungu1"),
                    sigungu2=item.get("sigungu2"),
                    dong=item.get("dong")
                ) for item in results['items']
            ]
            
            # search_id를 응답 헤더에 추가 (기존 진행 중인 검색 ID)
            response_headers = {"X-Search-ID": existing_search_id}
            return response_items
    
    # 검색 요청 정보 저장
    user_id = user_data.get("id") if user_data else None
    username = user_data.get("username") if user_data else "익명 사용자"
    
    # 검색 요청 DB 저장 (실제 크롤링 수행이므로 is_crawled는 기본값 True)
    try:
        search_request_record = await db_service.save_search_request(
            user_id=user_id,
            query=query,
            location="multiple"  # 여러 지역 검색을 의미
        )
        
        if search_request_record and "id" in search_request_record:
            search_request_id = search_request_record["id"]
            logger.info(f"검색 요청이 DB에 저장되었습니다. ID: {search_request_id}, is_crawled: True")
        else:
            search_request_id = str(uuid.uuid4())
            logger.warning(f"검색 요청 저장 실패, 임시 ID 사용: {search_request_id}")
    except Exception as e:
        search_request_id = str(uuid.uuid4())
        logger.error(f"DB 검색 요청 저장 실패: {str(e)}")
    
    # 현재 진행 중인 검색으로 등록
    async with active_searches_lock:
        active_searches[query] = search_request_id
        logger.info(f"쿼리 '{query}'를 진행 중인 검색으로 등록했습니다. ID: {search_request_id}")
    
    # place_list 테이블에서 검색할 장소 파라미터 가져오기
    place_params = await db_service.get_place_params()
    # 무작위로 섞기
    random.shuffle(place_params)
    logger.info(f"검색할 지역 파라미터 {len(place_params)}개 로드됨 (무작위 순서로 섞음)")
    
    # 프록시 초기화 - 모든 검색에서 공유할 스크래퍼 인스턴스 생성
    try:
        shared_scraper = DaangnScraper(use_proxy=True)
        await shared_scraper.setup_proxy()  # 비동기 초기화 호출 (여러 프록시 목록 로드)
        logger.info(f"공유 스크래퍼 인스턴스가 초기화되었습니다 (프록시 제공자: {shared_scraper.proxy.get('provider', '')}, 국가: {shared_scraper.proxy.get('country', '')}, IP: {shared_scraper.proxy.get('proxy_address', '')})")
    except Exception as e:
        logger.error(f"프록시 초기화 실패: {str(e)}")
        # 프록시 없이 진행할지 여부 결정
        # 여기서는 프록시 실패 시 검색을 중단하도록 구현
        return []
    
    # 초기 결과를 위해 첫 번째 지역 파라미터 사용 (존재하는 경우)
    initial_results = []
    first_place = None
    if place_params:
        first_place = place_params[0]
        logger.debug(f"첫 번째 지역 '{first_place['param']}'에서 '{search_request.query}' 검색을 시작합니다.")
        
        # 첫 번째 지역에 대한 검색 프로세스 생성 (프록시 정보 추가)
        try:
            process = await db_service.create_search_process(
                search_request_id=search_request_id,
                place_id=first_place["id"],
                param=first_place["param"],
                query=search_request.query,
                proxy_info=shared_scraper.proxy
            )
            
            if not process or "id" not in process:
                logger.error(f"첫 번째 지역 검색 프로세스 생성 실패")
                return []
                
            process_id = process["id"]
            
            # 공유 스크래퍼의 지역 설정 업데이트
            shared_scraper.location = first_place["param"]
            
            # 프록시 순환 횟수 추적
            proxy_rotation_count = 0
            max_proxy_rotations = len(shared_scraper.proxy_service.all_proxies) * 2  # 모든 프록시 2회 순환까지 시도 (무한 루프 방지)
            
            while proxy_rotation_count < max_proxy_rotations:
                try:
                    # 실제 검색 시작 시간 기록
                    await db_service.mark_search_process_started(process_id, shared_scraper.proxy)
                    
                    # 검색 시도
                    initial_results = await shared_scraper.search(search_request.query)
                    logger.info(f"첫 번째 지역 검색 결과: {len(initial_results)}개 항목 검색됨")
                    
                    # 초기 결과 저장
                    await db_service.save_search_results(
                        search_request_id=search_request_id,
                        results=initial_results,
                        query=search_request.query
                    )
                    
                    # 첫 번째 지역 검색 프로세스 완료 표시 (성공)
                    await db_service.update_search_process(
                        process_id=process_id,
                        is_completed=True,
                        items_count=len(initial_results),
                        proxy_info=shared_scraper.proxy
                    )
                    logger.info(f"첫 번째 지역 '{first_place['param']}' 검색 완료 (성공)")
                    break  # 성공했으므로 while 루프 종료
                    
                except Exception as search_error:
                    # 검색 시도 실패
                    error_msg = str(search_error)
                    logger.error(f"첫 번째 지역 '{first_place['param']}' 검색 중 오류 발생 (프록시 #{proxy_rotation_count+1}): {error_msg}")
                    
                    # 다음 프록시로 전환 시도
                    proxy_rotation_count += 1
                    logger.info(f"다음 프록시로 전환 시도 중... (시도 {proxy_rotation_count}/{max_proxy_rotations})")
                    
                    if await shared_scraper.switch_to_next_proxy():
                        logger.info(f"새 프록시로 전환 성공. 검색 재시도... (프록시 정보: {shared_scraper.proxy.get('provider', '')}/{shared_scraper.proxy.get('country', '')})")
                        # 루프 계속 (다음 반복에서 재시도)
                        continue
                    else:
                        # 프록시 전환 실패 (더 이상 프록시가 없음)
                        logger.error(f"다음 프록시로 전환 실패. 남은 사용 가능한 프록시가 없습니다.")
                        break  # while 루프 종료
            
            # 모든 프록시 시도 후에도 실패한 경우
            if proxy_rotation_count >= max_proxy_rotations or (proxy_rotation_count > 0 and not initial_results):
                logger.error(f"첫 번째 지역 '{first_place['param']}' 검색 실패: 모든 가능한 프록시 ({proxy_rotation_count}개) 시도 후 실패")
                
                # 프로세스를 실패로 표시
                await db_service.update_search_process(
                    process_id=process_id,
                    is_completed=False,
                    items_count=0,
                    error_message=f"모든 프록시 시도 후 실패 ({proxy_rotation_count}회 시도)",
                    proxy_info=shared_scraper.proxy
                )
                initial_results = []
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"첫 번째 지역 검색 전체 처리 중 오류 발생: {error_msg}")
            
            if process and "id" in process:
                # 오류 발생 시 프로세스 상태 업데이트 (실패로 표시)
                await db_service.update_search_process(
                    process_id=process["id"],
                    is_completed=False,  # 실패로 표시
                    items_count=0,
                    error_message=f"처리 오류: {error_msg}",  # 오류 메시지 저장
                    proxy_info=shared_scraper.proxy if hasattr(shared_scraper, 'proxy') else None
                )
                logger.info(f"첫 번째 지역 '{first_place['param']}' 검색 실패로 기록됨 (전체 처리 오류)")
                
            # 실패했을 경우 빈 결과 반환하여 사용자에게 알림
            initial_results = []
    
    # 각 지역별 검색을 백그라운드에서 병렬로 실행 (첫 번째 지역 제외)
    async def run_background_tasks():
        try:
            # 세마포어 사용하여 400개 제한으로 작업 실행
            logger.info(f"최대 {MAX_CONCURRENT_REQUESTS}개의 동시 요청 제한으로 백그라운드 검색 작업 시작")
            
            # 모든 지역 파라미터 (첫 번째 제외)
            remaining_places = place_params[1:]
            total_places = len(remaining_places)
            logger.info(f"총 {total_places}개의 지역에 대한 검색 작업을 처리합니다.")
            
            # 작업 완료 시 호출되는 콜백 함수
            async def process_next_places():
                nonlocal remaining_places
                
                # 처리할 지역이 남아있으면 다음 지역 처리
                if remaining_places:
                    place_param = remaining_places.pop(0)
                    current_index = total_places - len(remaining_places)
                    
                    # 각 장소별로 독립된 스크래퍼 인스턴스 생성
                    place_scraper = DaangnScraper(location=place_param["param"], use_proxy=True)
                    # 스크래퍼 초기화 (공유 스크래퍼의 프록시 서비스 재활용)
                    place_scraper.proxy_service = shared_scraper.proxy_service
                    
                    # 인덱스에 따라 순차적으로 프록시 할당 (프록시 개수를 초과하면 순환)
                    proxy_index = current_index % len(place_scraper.proxy_service.all_proxies)
                    place_scraper.proxy_service.current_index = proxy_index
                    
                    # 해당 인덱스의 프록시 가져오기
                    place_scraper.proxy, place_scraper.proxy_url = place_scraper.proxy_service.get_proxy()
                    
                    logger.info(f"지역 '{place_param['param']}'에 프록시 #{proxy_index+1} 할당: {place_scraper.proxy.get('provider', '')}/{place_scraper.proxy.get('country', '')}")
                    
                    # 세마포어 획득하여 검색 작업 실행
                    async with request_semaphore:
                        try:
                            # 검색 작업 실행
                            await perform_area_search(
                                place_scraper,
                                search_request_id,
                                search_request.query,
                                place_param
                            )
                        finally:
                            # 완료 후 다음 작업 예약
                            asyncio.create_task(process_next_places())
            
            # 초기 작업 시작 (최대 400개까지)
            initial_batch_size = min(MAX_CONCURRENT_REQUESTS, len(remaining_places))
            initial_tasks = []
            
            for _ in range(initial_batch_size):
                if remaining_places:
                    initial_tasks.append(asyncio.create_task(process_next_places()))
            
            logger.info(f"초기 {len(initial_tasks)}개 작업을 시작합니다.")
            
            # 초기 작업 완료 대기
            if initial_tasks:
                await asyncio.gather(*initial_tasks)
                
            # 남은 작업이 모두 완료될 때까지 대기
            while len(remaining_places) > 0 or len(asyncio.all_tasks()) - len(asyncio.all_tasks() & {asyncio.current_task()}) > 0:
                await asyncio.sleep(1)
                
            logger.info("모든 검색 작업이 요청되었습니다. 실제 완료 여부는 DB 상태로 확인합니다.")
            
            # 실제로 모든 검색 프로세스가 완료되었는지 DB에서 확인
            await check_and_mark_search_completed(search_request_id, search_request.query.strip().lower())
            
        except Exception as e:
            logger.error(f"백그라운드 검색 작업 실행 중 오류 발생: {str(e)}")
        finally:
            # 백그라운드 태스크 자체가 완료되면 running_tasks에서 제거
            if background_task in running_tasks:
                running_tasks.remove(background_task)

    # 백그라운드 태스크 시작
    background_task = asyncio.create_task(run_background_tasks())
    background_task.add_done_callback(lambda t: None)  # 에러 억제
    running_tasks.add(background_task)
    
    # 응답 형식으로 변환 - 필요한 필드만 포함
    results = [
        SearchResultItem(
            title=item["title"],
            price=item["price"],
            link=item["link"],
            location=item["location"],
            content=item.get("content", ""),
            thumbnail=item.get("thumbnail", ""),
            created_at_origin=item.get("created_at_origin", ""),
            boosted_at=item.get("boosted_at", ""),
            nickname=item.get("nickname", ""),
            status=item.get("status", ""),
            category_id=item.get("category_id"),
            is_new=item.get("is_new", False),
            dong_id=item.get("dong_id"),
            place_title_original=item.get("place_title_original"),
            sido=item.get("sido"),
            sigungu1=item.get("sigungu1"),
            sigungu2=item.get("sigungu2"),
            dong=item.get("dong")
        ) for item in initial_results
    ]
    
    # 응답 헤더에 검색 ID 추가를 위해 응답 객체에 정보 추가
    response_headers = {"X-Search-ID": search_request_id}
    
    logger.debug(f"검색 요청 '{search_request.query}'에 대한 응답을 반환합니다. 나머지 {len(place_params) - 1}개 지역은 백그라운드에서 검색 중")
    return results

# 검색 완료 여부를 확인하고 완료된 경우 active_searches에서 제거하는 함수
async def check_and_mark_search_completed(search_request_id: str, query: str):
    """검색 프로세스가 실제로 모두 완료되었는지 주기적으로 확인하고, 완료된 경우 active_searches에서 제거합니다"""
    try:
        # 검색 프로세스의 상태를 즉시 확인
        status = await db_service.get_search_process_status(search_request_id)
        
        # 완료 여부 확인 (모든 프로세스가 완료된 경우)
        if status["total"] > 0 and status["completed"] == status["total"]:
            async with active_searches_lock:
                if query in active_searches and active_searches[query] == search_request_id:
                    del active_searches[query]
                    logger.info(f"모든 검색 프로세스가 완료되었습니다. 쿼리 '{query}'를 활성 목록에서 즉시 제거합니다. ID: {search_request_id}")
            
            # 즉시 완료된 경우 더 이상 검사할 필요가 없음
            return
        
        # 아직 완료되지 않은 경우 주기적으로 확인
        retry_count = 0
        max_retries = 30  # 최대 30분(30 * 60초) 동안 완료 여부 확인
        check_interval = 60  # 60초 간격으로 확인
        
        logger.info(f"검색 ID {search_request_id}의 완료 여부 확인 작업 시작")
        
        while retry_count < max_retries:
            # 1분 대기
            await asyncio.sleep(check_interval)
            
            # 검색 프로세스의 상태를 확인
            status = await db_service.get_search_process_status(search_request_id)
            
            if status["total"] > 0:
                completion_percentage = status["percentage"]
                logger.info(f"검색 ID {search_request_id} 진행 상태: {status['completed']}/{status['total']} 완료 ({completion_percentage:.2f}%)")
                
                # 모든 프로세스가 완료된 경우
                if status["completed"] == status["total"]:
                    async with active_searches_lock:
                        if query in active_searches and active_searches[query] == search_request_id:
                            del active_searches[query]
                            logger.info(f"모든 검색 프로세스가 완료되었습니다. 쿼리 '{query}'를 활성 목록에서 제거합니다. ID: {search_request_id}")
                    break
                
                # 진행률이 100%에 가까운 경우에도 삭제 고려 (99% 이상인 경우)
                if completion_percentage >= 99:
                    async with active_searches_lock:
                        if query in active_searches and active_searches[query] == search_request_id:
                            del active_searches[query]
                            logger.info(f"검색 진행률이 99% 이상 ({completion_percentage:.2f}%)이므로 쿼리 '{query}'를 활성 목록에서 제거합니다. ID: {search_request_id}")
                    break
            
            # 다음 반복
            retry_count += 1
        
        # 최대 재시도 횟수를 초과한 경우
        if retry_count >= max_retries:
            logger.warning(f"검색 ID {search_request_id}의 완료 여부 확인이 시간 초과되었습니다. 진행 상태: {status['completed']}/{status['total']} ({status['percentage']:.2f}%)")
            
            # 시간 초과되어도 안전하게 목록에서 제거
            async with active_searches_lock:
                if query in active_searches and active_searches[query] == search_request_id:
                    del active_searches[query]
                    logger.warning(f"시간 초과로 쿼리 '{query}'를 활성 목록에서 제거합니다. ID: {search_request_id}")
    
    except Exception as e:
        logger.error(f"검색 완료 여부 확인 중 오류 발생: {str(e)}")
        
        # 오류가 발생해도 안전하게 목록에서 제거
        async with active_searches_lock:
            if query in active_searches and active_searches[query] == search_request_id:
                del active_searches[query]
                logger.error(f"오류 발생으로 쿼리 '{query}'를 활성 목록에서 제거합니다. ID: {search_request_id}")

@router.get("/status/{search_request_id}", response_model=Dict)
async def get_search_status(
    search_request_id: str,
    user_data: Optional[Dict] = Depends(verify_token)
):
    """검색 진행 상태 API - 특정 검색 요청의 진행 상태를 반환합니다"""
    logger.info(f"검색 상태 요청: {search_request_id}")
    
    # 검색 프로세스 상태 조회
    status = await db_service.get_search_process_status(search_request_id)
    
    # 검색 결과 수 조회
    results = await db_service.get_search_results(
        search_request_id=search_request_id,
        page=1,
        page_size=1,  # 여기서는 개수만 확인하므로 1개만 요청
        sort_by="created_at_desc",
        only_available=False
    )
    
    # 오류가 발생한 프로세스들 조회
    error_processes = await db_service.get_error_processes(search_request_id)
    
    # place_params 전체 개수 조회 (id_min=1, id_max=3000)
    place_params = await db_service.get_place_params()
    place_params_count = len(place_params)
    
    # 완료율 계산 수정: place_params_count 기준으로 계산
    completion_percentage = (status["completed"] / place_params_count * 100) if place_params_count > 0 else 0
    
    # 최신 결과 반환
    response = {
        "search_id": search_request_id,
        "total_processes": status["total"],
        "completed_processes": status["completed"],
        "failed_processes": len(error_processes),
        "completion_percentage": round(completion_percentage, 2),  # 수정된 완료율
        "total_items_found": results["total"],  # 전체 아이템 수를 가져옴
        "is_completed": status["total"] > 0 and status["completed"] == status["total"],
        "error_processes": error_processes,  # 오류 발생 프로세스 정보 추가
        "place_params_count": place_params_count  # 실제 place_params의 전체 개수 추가
    }
    
    return response

@router.get("/recent", response_model=List[Dict])
async def get_recent_searches(
    limit: int = 10,
    user_data: Dict = Depends(verify_token)
):
    """최근 검색 기록 API - 사용자의 최근 검색 기록을 반환합니다 (동일 쿼리는 가장 최근 검색만 포함, 실제 크롤링된 검색(is_crawled=True)만 대상)"""
    user_id = user_data.get("id") if user_data else None
    username = user_data.get("username") if user_data else "익명 사용자"
    
    # 사용자 ID가 없는 경우 인증 오류 발생
    if not user_id:
        logger.warning("인증되지 않은 사용자가 최근 검색 기록을 요청했습니다.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이 기능을 사용하려면 로그인이 필요합니다."
        )
    
    # 로그인 상태 정보 로깅
    logger.info(f"로그인 사용자(ID: {user_id}, 이름: {username})가 검색 이력을 조회합니다.")
    
    try:
        logger.debug(f"사용자 ID {user_id}의 최근 검색 이력 {limit}개를 조회합니다 (쿼리별 중복 제거, 실제 크롤링된 검색만).")
        recent_searches = await db_service.get_recent_searches(
            user_id=user_id,
            limit=limit
        )
        
        # 각 검색에 대한 상태 정보 추가
        for search in recent_searches:
            if "id" in search:
                status = await db_service.get_search_process_status(search["id"])
                search["progress"] = status["percentage"]
                search["total_items"] = status["total_items"]
        
        logger.info(f"DB에서 {len(recent_searches)}개의 검색 이력을 가져왔습니다 (동일 쿼리는 최신 항목만 포함, 실제 크롤링된 검색만).")
        return recent_searches
    except Exception as e:
        logger.error(f"DB 검색 이력 조회 실패: {str(e)}")
        return []

@router.get("/results/{search_request_id}", response_model=SearchResponse)
async def get_search_results(
    search_request_id: str,
    page: int = 1,
    page_size: int = 20,
    sort_by: str = "created_at_desc",
    only_available: bool = False,
    category_id: Optional[List[int]] = Query(None),
    sido: Optional[str] = None,
    sigungu1: Optional[str] = None, 
    sigungu2: Optional[str] = None,
    dong: Optional[str] = None,
    user_data: Optional[Dict] = Depends(verify_token)
):
    """검색 결과 조회 API - 특정 검색 요청의 결과를 반환합니다 (페이징, 정렬, 필터 지원)"""
    try:
        logger.debug(f"검색 요청 ID {search_request_id}의 결과를 조회합니다. 페이지: {page}, 정렬: {sort_by}, 거래가능만: {only_available}, 카테고리: {category_id}, 지역필터: 시도={sido}, 시군구1={sigungu1}, 시군구2={sigungu2}, 동={dong}")
        
        # 페이지 번호와 사이즈 검증
        if page < 1:
            page = 1
        if page_size < 1 or page_size > 100:
            page_size = 20
            
        # 정렬 방식 검증
        valid_sort_options = ["created_at_desc", "price_asc"]
        if sort_by not in valid_sort_options:
            sort_by = "created_at_desc"
        
        # DB에서 필터링된 결과 가져오기
        result = await db_service.get_search_results(
            search_request_id=search_request_id,
            page=page,
            page_size=page_size,
            sort_by=sort_by,
            only_available=only_available,
            category_id=category_id,
            sido=sido,
            sigungu1=sigungu1,
            sigungu2=sigungu2,
            dong=dong
        )
        
        # 카테고리별 아이템 개수를 별도 필드로 추가
        category_counts = {}
        for cat_id in [1, 2, 3, 4, 5, 6, 7, 8, 9, 13, 14, 16, 31, 32, 139, 172, 173, 304, 305, 483]:
            key = str(cat_id)
            category_counts[key] = result.get(f"total_category_{cat_id}_items", 0)
        
        # 응답 객체 생성
        response = {
            "request_id": search_request_id,
            "results": [
                SearchResultItem(
                    title=item["title"],
                    price=item["price"],
                    link=item["link"],
                    location=item["location"],
                    content=item.get("content", ""),
                    thumbnail=item.get("thumbnail", ""),
                    created_at_origin=item.get("created_at_origin", ""),
                    boosted_at=item.get("boosted_at", ""),
                    nickname=item.get("nickname", ""),
                    status=item.get("status", ""),
                    category_id=item.get("category_id"),
                    is_new=item.get("is_new", False),
                    dong_id=item.get("dong_id"),
                    place_title_original=item.get("place_title_original"),
                    sido=item.get("sido"),
                    sigungu1=item.get("sigungu1"),
                    sigungu2=item.get("sigungu2"),
                    dong=item.get("dong")
                ) for item in result["items"]
            ],
            "pagination": {
                "current_page": result["page"],
                "total_pages": result["pages"],
                "page_size": result["page_size"],
                "total_items": result["total"],
                "has_next": result["has_next"],
                "has_prev": result["has_prev"]
            },
            "category_total_items": category_counts
        }
        
        logger.info(f"DB에서 {len(result['items'])}개의 검색 결과를 가져왔습니다. (총 {result['total']}개 중)")
        return response
    except Exception as e:
        logger.error(f"DB 검색 결과 조회 실패: {str(e)}")
        # 오류 발생 시에도 빈 결과와 페이징 정보 반환
        return {
            "request_id": search_request_id,
            "results": [],
            "pagination": {
                "current_page": page,
                "total_pages": 0,
                "page_size": page_size,
                "total_items": 0,
                "has_next": False,
                "has_prev": False
            },
            "category_total_items": {
                "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, 
                "6": 0, "7": 0, "8": 0, "9": 0, "13": 0, 
                "14": 0, "16": 0, "31": 0, "32": 0, "139": 0, 
                "172": 0, "173": 0, "304": 0, "305": 0, "483": 0
            }
        }

@router.get("/existing", response_model=List[SearchResultItem])
async def get_existing_search_results(
    query: str,
    user_data: Optional[Dict] = Depends(verify_token)
):
    """기존 검색 결과 API - 쿼리에 맞는 기존 검색 결과가 있으면 즉시 반환합니다"""
    logger.info(f"기존 검색 결과 요청: {query}")
    logger.info(f"사용자 인증 정보: {user_data}")
    
    try:
        # 사용자 ID 가져오기
        user_id = user_data.get("id") if user_data else None
        
        # 로그인 여부와 무관하게 계속 진행 (테스트를 위해 인증 검사 제거)
        # if not user_id:
        #     logger.info("로그인하지 않은 사용자의 기존 검색 결과 요청입니다.")
        #     return []
        
        logger.info(f"query='{query}' 검색 결과 처리 시작")
        
        # 최근 검색어 클릭 시 자동으로 새 검색 요청 생성하지 않음
        # 프론트엔드에서 별도로 요청할 때만 새 검색 생성
        
        # 방법 1: 사용자의 최근 검색에서 찾기 (로그인한 경우만)
        if user_id:
            logger.info(f"사용자({user_id})의 최근 검색 이력에서 '{query}' 검색 시도")
            recent_searches = await db_service.get_recent_searches(user_id=user_id, limit=5)
            matching_searches = [s for s in recent_searches if s["query"].lower() == query.lower()]
            
            if matching_searches:
                # 사용자의 검색 이력에서 찾은 경우
                latest_search = matching_searches[0]
                search_id = latest_search["id"]
                logger.info(f"사용자 검색 이력에서 일치하는 ID 찾음: {search_id}")
                
                results = await db_service.get_search_results(
                    search_request_id=search_id,
                    page=1,
                    page_size=100,
                    sort_by="created_at_desc",
                    only_available=False
                )
                
                if results['items']:
                    logger.info(f"사용자 자신의 검색 이력에서 {len(results['items'])}개 결과를 찾았습니다.")
                    logger.debug(f"첫 번째 결과 샘플: {results['items'][0] if results['items'] else '없음'}")
                    # 결과 변환 및 반환
                    response_items = [
                        SearchResultItem(
                            title=item["title"],
                            price=item["price"],
                            link=item["link"],
                            location=item["location"],
                            content=item.get("content", ""),
                            thumbnail=item.get("thumbnail", ""),
                            created_at_origin=item.get("created_at_origin", ""),
                            boosted_at=item.get("boosted_at", ""),
                            nickname=item.get("nickname", ""),
                            status=item.get("status", ""),
                            category_id=item.get("category_id"),
                            is_new=item.get("is_new", False),
                            dong_id=item.get("dong_id"),
                            place_title_original=item.get("place_title_original"),
                            sido=item.get("sido"),
                            sigungu1=item.get("sigungu1"),
                            sigungu2=item.get("sigungu2"),
                            dong=item.get("dong")
                        ) for item in results['items']
                    ]
                    logger.info(f"방법 1 성공: 사용자 이력에서 {len(response_items)}개 결과 반환")
                    return response_items
                else:
                    logger.info(f"사용자 이력에서 검색 ID는 찾았으나 결과 항목이 없음")
        
        # 방법 2: DB에 직접 쿼리로 검색 결과 찾기
        logger.info(f"DB에서 직접 검색 결과 조회 시도: '{query}'")
        direct_results = await db_service.get_search_results_by_query(query)
        
        if direct_results and len(direct_results) > 0:
            logger.info(f"DB에서 직접 쿼리로 {len(direct_results)}개 결과를 찾았습니다.")
            logger.debug(f"첫 번째 결과 샘플: {direct_results[0] if direct_results else '없음'}")
            
            # 결과 변환 및 반환
            response_items = [
                SearchResultItem(
                    title=item["title"],
                    price=item["price"],
                    link=item["link"],
                    location=item["location"],
                    content=item.get("content", ""),
                    thumbnail=item.get("thumbnail", ""),
                    created_at_origin=item.get("created_at_origin", ""),
                    boosted_at=item.get("boosted_at", ""),
                    nickname=item.get("nickname", ""),
                    status=item.get("status", ""),
                    category_id=item.get("category_id"),
                    is_new=item.get("is_new", False),
                    dong_id=item.get("dong_id"),
                    place_title_original=item.get("place_title_original"),
                    sido=item.get("sido"),
                    sigungu1=item.get("sigungu1"),
                    sigungu2=item.get("sigungu2"),
                    dong=item.get("dong")
                ) for item in direct_results
            ]
            logger.info(f"방법 2 성공: DB에서 직접 쿼리로 {len(response_items)}개 결과 반환")
            return response_items
            
        # 방법 3: 전체 검색 요청에서 동일한 쿼리 찾기 (이전 방법)
        logger.info(f"다른 사용자의 검색 요청에서 '{query}' 검색 시도")
        latest_request = await db_service.get_latest_search_request_by_query(query)
        
        if latest_request:
            search_id = latest_request["id"]
            logger.info(f"다른 사용자의 검색 이력에서 일치하는 ID 찾음: {search_id}")
            
            # 검색 결과 직접 조회
            results = await db_service.get_search_results(
                search_request_id=search_id,
                page=1,
                page_size=100,
                sort_by="created_at_desc",
                only_available=False
            )
            
            if results['items']:
                logger.info(f"다른 사용자의 검색 이력에서 {len(results['items'])}개 결과를 찾았습니다.")
                logger.debug(f"첫 번째 결과 샘플: {results['items'][0] if results['items'] else '없음'}")
                # 결과 변환 및 반환
                response_items = [
                    SearchResultItem(
                        title=item["title"],
                        price=item["price"],
                        link=item["link"],
                        location=item["location"],
                        content=item.get("content", ""),
                        thumbnail=item.get("thumbnail", ""),
                        created_at_origin=item.get("created_at_origin", ""),
                        boosted_at=item.get("boosted_at", ""),
                        nickname=item.get("nickname", ""),
                        status=item.get("status", ""),
                        category_id=item.get("category_id"),
                        is_new=item.get("is_new", False),
                        dong_id=item.get("dong_id"),
                        place_title_original=item.get("place_title_original"),
                        sido=item.get("sido"),
                        sigungu1=item.get("sigungu1"),
                        sigungu2=item.get("sigungu2"),
                        dong=item.get("dong")
                    ) for item in results['items']
                ]
                logger.info(f"방법 3 성공: 다른 사용자 이력에서 {len(response_items)}개 결과 반환")
                return response_items
        
        # 검색 결과가 없는 경우
        logger.info(f"쿼리 '{query}'에 대한 기존 검색 결과가 없습니다 (모든 방법 실패)")
        return []
    except Exception as e:
        logger.error(f"기존 검색 결과 조회 중 오류 발생: {str(e)}")
        # 스택 트레이스도 로깅
        import traceback
        logger.error(f"상세 오류 정보: {traceback.format_exc()}")
        return []

@router.get("/latest-time", response_model=Dict)
async def get_latest_search_time(
    query: str,
    user_data: Optional[Dict] = Depends(verify_token)
):
    """쿼리에 대한 최근 검색 시간 API - 쿼리에 대한 가장 최근 실제 크롤링 시간을 반환합니다 (is_crawled=True인 경우만)"""
    logger.info(f"쿼리 '{query}'의 최근 크롤링 시간 요청")
    
    try:
        latest_time = await db_service.get_latest_search_time(query)
        
        if latest_time:
            return {
                "query": query,
                "has_results": True,
                "latest_time": latest_time.isoformat()
            }
        else:
            return {
                "query": query,
                "has_results": False,
                "latest_time": None
            }
    except Exception as e:
        logger.error(f"최근 검색 시간 조회 중 오류 발생: {str(e)}")
        return {
            "query": query,
            "has_results": False,
            "latest_time": None,
            "error": str(e)
        }

@router.get("/check-active", response_model=Dict)
async def check_active_search(
    query: str,
    user_data: Optional[Dict] = Depends(verify_token)
):
    """주어진 쿼리가 현재 진행 중인 검색인지 확인합니다"""
    normalized_query = query.strip().lower()
    logger.info(f"쿼리 '{normalized_query}'가 현재 진행 중인지 확인 요청")
    
    search_id = None
    is_active = False
    
    # 현재 진행 중인 검색 목록에서 검색
    async with active_searches_lock:
        if normalized_query in active_searches:
            search_id = active_searches[normalized_query]
            is_active = True
            
            # 검색이 이미 완료되었는지 확인
            if search_id:
                status = await db_service.get_search_process_status(search_id)
                if status["total"] > 0 and status["completed"] == status["total"]:
                    # 검색이 완료된 경우 active_searches에서 제거
                    logger.info(f"쿼리 '{normalized_query}'의 검색이 완료되었으므로 활성 목록에서 제거합니다. (검색 ID: {search_id})")
                    del active_searches[normalized_query]
                    is_active = False
    
    logger.info(f"쿼리 '{normalized_query}' 활성 상태: {is_active}" + (f", 검색 ID: {search_id}" if search_id else ""))
    
    return {
        "query": normalized_query,
        "is_active": is_active,
        "search_id": search_id if is_active else None
    }

@router.get("/", response_model=List[SearchResultItem])
async def search_products_get(
    q: str,
    user_data: Optional[Dict] = Depends(verify_token)
):
    """URL 파라미터로 상품 검색 API - 당근마켓에서 상품을 검색합니다 (GET 요청용)"""
    # POST 엔드포인트와 동일한 로직을 사용하기 위해 검색 요청 객체 생성
    search_request = SearchRequest(query=q)
    
    # 백그라운드 태스크를 위한 가짜 객체 (사용되지 않음)
    class DummyBackgroundTasks:
        def add_task(self, func, *args, **kwargs):
            pass
    
    dummy_background_tasks = DummyBackgroundTasks()
    
    # 기존의 POST 엔드포인트로 요청 전달
    return await search_products(
        search_request=search_request,
        background_tasks=dummy_background_tasks,
        user_data=user_data
    ) 