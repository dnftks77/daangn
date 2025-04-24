import os
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
import pytz
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, Text, Float, DateTime, Table, MetaData, Boolean, func, and_
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid

# 로깅 설정
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 한국 시간대 설정
KST = pytz.timezone('Asia/Seoul')

# SQLAlchemy 설정
DB_HOST = os.environ.get("DB_HOST", "localhost")
DB_PORT = os.environ.get("DB_PORT", "5432")
DB_USER = os.environ.get("DB_USER", "postgres")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "postgres")
DB_NAME = os.environ.get("DB_NAME", "daangn_db")

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 모델 정의
class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(KST))
    last_sign_in_at = Column(DateTime, nullable=True)
    is_admin = Column(Boolean, default=False)  # 관리자 권한 여부

class SearchRequest(Base):
    __tablename__ = "search_requests"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    query = Column(String, nullable=False)
    location = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(KST))
    is_crawled = Column(Boolean, default=True)  # 실제 크롤링 수행 여부

class SearchResult(Base):
    __tablename__ = "search_results"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    query = Column(String, nullable=False)
    title = Column(Text, nullable=False)
    link = Column(Text, nullable=False)
    thumbnail = Column(Text, nullable=True)
    location = Column(Text, nullable=True)
    sido = Column(Text, nullable=True)
    dong_id = Column(String, nullable=True)
    price = Column(Float, nullable=True)
    status = Column(Text, nullable=True)
    content = Column(Text, nullable=True)
    nickname = Column(Text, nullable=True)
    nickname_id = Column(Text, nullable=True)
    category = Column(Text, nullable=True)
    created_at_origin = Column(DateTime, nullable=True)
    boosted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(KST))
    updated_at = Column(DateTime, nullable=True)

class PlaceList(Base):
    __tablename__ = "place_list"
    
    id = Column(Integer, primary_key=True)
    sido = Column(String, default='')
    sigungu = Column(String, default='')
    dong = Column(String, nullable=False)
    param = Column(String, nullable=False)
    dong_id = Column(Integer, nullable=False)
    place_title_original = Column(Text, default='')
    tried_param = Column(Text, nullable=True)
    from_area = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(KST))
    updated_at = Column(DateTime, default=lambda: datetime.now(KST))

class SearchProcess(Base):
    __tablename__ = "search_process"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    search_request_id = Column(UUID(as_uuid=True), ForeignKey("search_requests.id"), nullable=True)
    query = Column(String, nullable=False)
    place_id = Column(Integer, ForeignKey("place_list.id"), nullable=True)
    param = Column(String, nullable=False)
    is_completed = Column(Boolean, default=False)
    start_time = Column(DateTime, nullable=True)  # 실제 검색 시작 시간을 저장하기 위해 기본값 제거
    end_time = Column(DateTime, nullable=True)
    items_count = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)  # 오류 메시지 저장 필드
    proxy_provider = Column(Text, nullable=True)  # 프록시 제공자 정보
    proxy_ip = Column(Text, nullable=True)       # 프록시 IP 주소
    proxy_country = Column(Text, nullable=True)  # 프록시 국가 코드
    created_at = Column(DateTime, default=lambda: datetime.now(KST))
    updated_at = Column(DateTime, default=lambda: datetime.now(KST))

class DBService:
    """PostgreSQL을 통해 검색 결과를 저장하고 관리하는 서비스"""
    
    def __init__(self):
        """데이터베이스 연결 초기화"""
        self.session = None
    
    def get_session(self):
        """세션 반환"""
        if self.session is None:
            self.session = SessionLocal()
        return self.session
    
    def close_session(self):
        """세션 종료"""
        if self.session:
            self.session.close()
            self.session = None
    
    async def save_search_request(self, user_id: Optional[str], query: str, location: Optional[str], is_crawled: bool = True) -> Dict:
        """검색 요청 정보를 저장합니다"""
        try:
            session = self.get_session()
            
            # UUID로 변환 처리
            user_uuid = None
            if user_id:
                try:
                    user_uuid = uuid.UUID(user_id)
                except ValueError:
                    pass
            
            # 검색 요청 생성
            search_request = SearchRequest(
                user_id=user_uuid,
                query=query,
                location=location or "전국",
                created_at=datetime.now(KST),
                is_crawled=is_crawled  # 실제 크롤링 여부 설정
            )
            
            session.add(search_request)
            session.commit()
            session.refresh(search_request)
            
            # 결과 반환을 위해 딕셔너리로 변환
            result = {
                "id": str(search_request.id),
                "user_id": str(search_request.user_id) if search_request.user_id else None,
                "query": search_request.query,
                "location": search_request.location,
                "created_at": search_request.created_at.isoformat(),
                "is_crawled": search_request.is_crawled
            }
            
            logger.info(f"검색 요청 저장 성공: ID {result['id']}, 크롤링 여부: {is_crawled}")
            return result
            
        except Exception as e:
            if session:
                session.rollback()
            logger.error(f"검색 요청 저장 중 오류 발생: {str(e)}")
            raise
        finally:
            self.close_session()
    
    async def save_search_results(self, search_request_id: str, results: List[Dict], query: str) -> List[Dict]:
        """검색 결과를 저장합니다. 동일한 link 값이 있으면 업데이트합니다."""
        try:
            if not results:
                logger.warning("저장할 검색 결과가 없습니다.")
                return []
            
            session = self.get_session()
            saved_results = []
            
            # 검색 요청 ID UUID 변환
            try:
                search_request_uuid = uuid.UUID(search_request_id)
            except ValueError:
                logger.error(f"잘못된 검색 요청 ID 형식: {search_request_id}")
                return []
            
            # 각 결과 저장
            for item in results:
                try:
                    # ISO 8601 형식의 날짜 문자열을 파싱
                    created_at_origin = self._parse_datetime(item.get("created_at_origin", ""))
                    boosted_at = self._parse_datetime(item.get("boosted_at", ""))
                    
                    # 위치 정보 처리
                    location = item.get("location", "")
                    sido = None
                    dong_id = item.get("dong_id", "")
                    
                    # place_list 테이블에서 해당 지역(동)에 매칭되는 시도(sido) 정보 조회
                    if location:
                        # 동 이름과 일치하는 place_list 레코드 조회
                        place = session.query(PlaceList).filter(
                            PlaceList.dong == location
                        ).first()
                        
                        if place and place.sido:
                            sido = place.sido
                            logger.debug(f"지역 '{location}'에 대한 시도 정보 '{sido}' 조회됨")
                        else:
                            logger.debug(f"지역 '{location}'에 대한 시도 정보를 찾을 수 없음")
                    
                    # 동일한 link를 가진 기존 항목 검색
                    existing_result = session.query(SearchResult).filter(
                        SearchResult.link == item["link"]
                    ).first()
                    
                    if existing_result:
                        # 기존 데이터 업데이트
                        existing_result.title = item["title"]
                        existing_result.price = self._parse_price(item.get("price"))
                        existing_result.thumbnail = item.get("thumbnail")
                        existing_result.location = location
                        existing_result.sido = sido  # sido 정보 추가
                        existing_result.dong_id = dong_id  # 지역 ID 추가
                        existing_result.status = item.get("status")
                        existing_result.content = item.get("content")
                        existing_result.nickname = item.get("nickname")
                        existing_result.nickname_id = item.get("nickname_id")
                        existing_result.category = item.get("category")
                        existing_result.query = query  # 검색어 설정
                        if created_at_origin:
                            existing_result.created_at_origin = created_at_origin
                        if boosted_at:
                            existing_result.boosted_at = boosted_at
                        existing_result.updated_at = datetime.now(KST)
                        
                        # 결과 저장
                        result_dict = self._search_result_to_dict(existing_result)
                        saved_results.append(result_dict)
                    else:
                        # 새 항목 생성
                        new_result = SearchResult(
                            query=query,  # 검색어 설정
                            title=item["title"],
                            link=item["link"],
                            price=self._parse_price(item.get("price")),
                            thumbnail=item.get("thumbnail"),
                            location=location,
                            sido=sido,  # sido 정보 추가
                            dong_id=dong_id,  # 지역 ID 추가
                            status=item.get("status"),
                            content=item.get("content"),
                            nickname=item.get("nickname"),
                            nickname_id=item.get("nickname_id"),
                            category=item.get("category"),
                            created_at_origin=created_at_origin,
                            boosted_at=boosted_at,
                            created_at=datetime.now(KST)
                        )
                        
                        session.add(new_result)
                        session.flush()  # ID 생성을 위해 flush
                        
                        # 결과 저장
                        result_dict = self._search_result_to_dict(new_result)
                        saved_results.append(result_dict)
                except Exception as e:
                    logger.warning(f"항목 저장 중 오류 발생: {str(e)}")
                    continue
            
            # 모든 변경사항 커밋
            session.commit()
            logger.info(f"검색 결과 {len(saved_results)}개 저장 완료")
            return saved_results
            
        except Exception as e:
            if session:
                session.rollback()
            logger.error(f"검색 결과 저장 중 오류 발생: {str(e)}")
            raise
        finally:
            self.close_session()
    
    async def get_recent_searches(self, user_id: Optional[str] = None, limit: int = 10) -> List[Dict]:
        """최근 검색 기록을 가져옵니다. 동일한 쿼리는 가장 최근 것만 남기고 중복 제거합니다."""
        try:
            session = self.get_session()
            
            # 유저 ID 필터링
            user_uuid = None
            if user_id:
                try:
                    user_uuid = uuid.UUID(user_id)
                except ValueError:
                    pass
            
            # 중복 제거된 최근 검색 쿼리
            if user_uuid:
                # 사용자별 최근 검색에서 쿼리별로 그룹화하고 각 쿼리의 가장 최근 레코드만 선택
                # is_crawled = True인 검색만 대상으로 함
                # SearchRequest.query로 GROUP BY 하고 각 그룹에서 created_at이 가장 큰(최신) 레코드 선택
                subq = session.query(
                    SearchRequest.query,
                    func.max(SearchRequest.created_at).label('max_created_at')
                ).filter(
                    SearchRequest.user_id == user_uuid,
                    SearchRequest.is_crawled == True  # 실제 크롤링된 검색만 포함
                ).group_by(
                    SearchRequest.query
                ).subquery()
                
                # 원본 테이블과 서브쿼리 조인하여 각 쿼리의 가장 최근 검색 레코드만 가져옴
                query = session.query(SearchRequest).join(
                    subq,
                    and_(
                        SearchRequest.query == subq.c.query,
                        SearchRequest.created_at == subq.c.max_created_at,
                        SearchRequest.user_id == user_uuid,
                        SearchRequest.is_crawled == True  # 실제 크롤링된 검색만 포함
                    )
                ).order_by(SearchRequest.created_at.desc()).limit(limit)
                
                results = query.all()
                logger.info(f"사용자 ID {user_id}의 검색 기록 조회: 쿼리별 중복 제거 후 최근 {limit}개 (실제 크롤링된 검색만)")
            else:
                # 비로그인 사용자는 빈 결과 반환
                results = []
                logger.info("비로그인 사용자의 검색 기록 요청: 빈 결과 반환")
            
            # 결과 변환
            searches = []
            for item in results:
                # 시간을 KST로 변환
                created_at = item.created_at
                if created_at.tzinfo is None:
                    created_at = pytz.UTC.localize(created_at).astimezone(KST)
                else:
                    created_at = created_at.astimezone(KST)
                
                searches.append({
                    "id": str(item.id),
                    "user_id": str(item.user_id) if item.user_id else None,
                    "query": item.query,
                    "location": item.location,
                    "created_at": created_at.strftime("%Y-%m-%d %H:%M:%S")
                })
            
            logger.info(f"최근 검색 {len(searches)}개를 조회했습니다 (동일 쿼리는 최신 항목만 포함, 실제 크롤링된 검색만)")
            return searches
            
        except Exception as e:
            logger.error(f"최근 검색 조회 중 오류 발생: {str(e)}")
            return []
        finally:
            self.close_session()
    
    async def get_search_results(self, 
                               search_request_id: str, 
                               page: int = 1, 
                               page_size: int = 20, 
                               sort_by: str = "created_at_desc", 
                               only_available: bool = False,
                               category_id: Optional[List[int]] = None) -> Dict:
        """특정 검색 요청에 대한 검색 결과를 가져옵니다 (페이징, 정렬, 필터 지원)"""
        try:
            session = self.get_session()
            
            # 검색 요청 ID UUID 변환
            try:
                search_request_uuid = uuid.UUID(search_request_id)
            except ValueError:
                logger.error(f"잘못된 검색 요청 ID 형식: {search_request_id}")
                return {"items": [], "total": 0}
            
            # 검색 요청에서 query 가져오기
            search_request = session.query(SearchRequest).filter(
                SearchRequest.id == search_request_uuid
            ).first()
            
            if not search_request:
                logger.error(f"검색 요청 ID {search_request_id}를 찾을 수 없습니다")
                return {"items": [], "total": 0}
            
            query = search_request.query
            
            # 검색 요청이 2개 이상인지 확인
            has_previous_search = False
            previous_searches_count = session.query(SearchRequest).filter(
                SearchRequest.query == query
            ).count()
            has_previous_search = previous_searches_count >= 2
            
            # 가장 최근 검색 시간 가져오기 (새 상품 표시를 위해)
            latest_search_time = search_request.created_at
            if latest_search_time.tzinfo is None:
                latest_search_time = pytz.UTC.localize(latest_search_time).astimezone(KST)
            logger.info(f"가장 최근 검색 시간: {latest_search_time}, 이전 검색 존재 여부: {has_previous_search}")
            
            # 카테고리 URL과 ID 간의 매핑
            category_url_to_id = {
                "https://dnvefa72aowie.cloudfront.net/origin/category/202306/2c0811ac0c0f491039082d246cd41de636d58cd6e54368a0b012c386645d7c66.png": 1,  # 디지털기기
                "https://dnvefa72aowie.cloudfront.net/origin/category/202306/ff36d0fb3a3214a9cc86c79a84262e0d9e11b6d7289ed9aa75e40d0129764fac.png": 172,  # 생활가전
                "https://dnvefa72aowie.cloudfront.net/origin/category/202306/088e41c5973184228a2e4a50961ceb6fc366bb3eb11b1ee7c7cd66bcdf9c5529.png": 8,  # 가구/인테리어
                "https://dnvefa72aowie.cloudfront.net/origin/category/202306/22a78937b8a8ccd0003ff7bb7c247b3863a5046f93a36b5341913ff2935efa43.png": 7,  # 생활/주방
                "https://dnvefa72aowie.cloudfront.net/origin/category/202306/1975d6ba1725dfbe053daa450cec51757a39943104d57fbdd3fc5c7d8ae07605.png": 4,  # 유아동
                "https://dnvefa72aowie.cloudfront.net/origin/category/202306/987b21e9e02255cb310e4736b16e056d0bfc90c397e423e599b544bad203601e.png": 173,  # 유아도서
                "https://dnvefa72aowie.cloudfront.net/origin/brand/202402/b99fb12bcc754a08e5a6f359861bafd80d38678a0c58521abdf314949f9c5e58.png": 5,  # 여성의류
                "https://dnvefa72aowie.cloudfront.net/origin/category/202306/23f6b89ba63da7cf8135e1063bde3811fb6499dc073585eea161b3727a42535e.png": 31,  # 여성잡화
                "https://dnvefa72aowie.cloudfront.net/origin/category/202306/38dd757c99863d1748f16292142cabfae9621622cc751faff49a79ed60c1c5e7.png": 14,  # 남성패션/잡화
                "https://dnvefa72aowie.cloudfront.net/origin/category/202306/1efa73a4e3b45610292223f44c42cbe3c7d93395a23f1134426a58d5639c179b.png": 6,  # 뷰티/미용
                "https://dnvefa72aowie.cloudfront.net/origin/category/202306/6379c3ba41f03dc6e27796c5f106c8b20b57d79ddb3ba52440084fcd4d10d8dd.png": 3,  # 스포츠/레저
                "https://dnvefa72aowie.cloudfront.net/origin/category/202306/074da39b1114588ebc61447883f5f0059dd4abc16127f4250f559360f40eb0e2.png": 2,  # 취미/게임/음반
                "https://dnvefa72aowie.cloudfront.net/origin/category/202306/0ce93f6b19d61169b955dae5422aa9f842933d8ccf35dc4c53cea8656a293e40.png": 9,  # 도서
                "https://dnvefa72aowie.cloudfront.net/origin/category/202306/631cb98e2c7cf46f1f2520f97b0ec2d30ce426c4c158ea3673f84e0aca088181.png": 304,  # 티켓/교환권
                "https://dnvefa72aowie.cloudfront.net/origin/category/202306/243b21522a5ff57863942f0ed84a04b3cc72f30ca9edda818f31238fc94066ee.png": 305,  # 가공식품
                "https://dnvefa72aowie.cloudfront.net/origin/brand/202407/c22153f3cca52c69efb2b4c15e8e644ea7118b2f8c07d378ec8b75489c31cf46.png": 483,  # 건강기능식품
                "https://dnvefa72aowie.cloudfront.net/origin/category/202306/763d2fb8809deb0a5ebd4ef2694ecb2d8b08f501ab185f7167d87a74a33aee10.png": 16,  # 반려동물용품
                "https://dnvefa72aowie.cloudfront.net/origin/category/202306/248610f466d99a9a7cafa1c75a818a73bf850e05c7f7c205cbc60c7b7b16f876.png": 139,  # 식물
                "https://dnvefa72aowie.cloudfront.net/origin/category/202306/407b005b01de954b59aff9e21f729b3c30e3ae249acfb643401f235598dea8e3.png": 13,  # 기타 중고물품
                "https://dnvefa72aowie.cloudfront.net/origin/category/202306/6a729d83f311aa3e8ffa12c9757cfda323591a0018ce2d25da6bf604615e33c2.png": 32,  # 삽니다
            }
            
            # ID와 URL 간의 매핑도 준비 (반대 방향)
            category_id_to_url = {v: k for k, v in category_url_to_id.items()}
            
            # 기본 쿼리 생성
            base_query = session.query(SearchResult).filter(
                SearchResult.query == query
            )
            
            # 거래 가능 필터 적용
            if only_available:
                base_query = base_query.filter(
                    (SearchResult.status.is_(None)) | 
                    (SearchResult.status == '') | 
                    (SearchResult.status == 'Ongoing')
                )
            
            # 카테고리 필터 적용
            if category_id and len(category_id) > 0:
                valid_category_urls = []
                for cat_id in category_id:
                    if cat_id in category_id_to_url:
                        valid_category_urls.append(category_id_to_url[cat_id])
                    else:
                        logger.warning(f"알 수 없는 카테고리 ID: {cat_id}")
                
                if valid_category_urls:
                    # 여러 카테고리 중 하나라도 포함된 경우 필터링 (OR 조건)
                    base_query = base_query.filter(
                        SearchResult.category.in_(valid_category_urls)
                    )
                    logger.info(f"카테고리 필터 적용: {len(valid_category_urls)}개 카테고리, IDs: {category_id}")
            
            # 정렬 적용
            if sort_by == "price_asc":
                # 가격이 null인 경우를 처리 (가격이 null인 경우 가장 마지막에)
                base_query = base_query.order_by(
                    SearchResult.price.is_(None),  # NULL 값 처리
                    SearchResult.price.asc()
                )
            else:  # 기본값은 created_at_desc
                # 기본적으로 최신순으로 정렬 (created_at_origin으로)
                base_query = base_query.order_by(
                    SearchResult.created_at_origin.desc()
                )
            
            # 전체 개수 계산
            total_count = base_query.count()
            
            # 카테고리별 개수 계산 (필터링 전의 모든 결과에 대해)
            category_counts = {}
            # category_id 목록
            category_ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 13, 14, 16, 31, 32, 139, 172, 173, 304, 305, 483]
            
            # 쿼리 복제 (필터링 적용하지 않은 쿼리)
            unfiltered_query = session.query(SearchResult).filter(
                SearchResult.query == query
            )
            
            # 각 카테고리 URL별 개수 계산
            for cat_url, cat_id in category_url_to_id.items():
                cat_count = unfiltered_query.filter(
                    SearchResult.category == cat_url
                ).count()
                category_counts[cat_id] = cat_count
            
            # 페이징 적용
            results = base_query.offset((page - 1) * page_size).limit(page_size).all()
            
            # 결과 변환
            search_results = []
            for item in results:
                result_dict = self._search_result_to_dict(item)
                # 카테고리 URL을 ID로 변환
                category_url = item.category
                if category_url in category_url_to_id:
                    result_dict["category_id"] = category_url_to_id[category_url]
                else:
                    result_dict["category_id"] = None
                
                # 가장 최근 검색 시간보다 나중에 생성된 아이템은 새 상품으로 표시
                # 이전 검색이 있는 경우에만 새 상품 표시
                if has_previous_search and latest_search_time and item.created_at:
                    result_dict["is_new"] = item.created_at > latest_search_time
                else:
                    result_dict["is_new"] = False
                
                search_results.append(result_dict)
            
            logger.info(f"검색 쿼리 '{query}'에 대한 검색 결과 {len(search_results)}개를 조회했습니다. (페이지 {page}/{(total_count + page_size - 1) // page_size})")
            
            # 페이징 정보와 함께 결과 반환
            result_data = {
                "items": search_results,
                "total": total_count,
                "page": page,
                "page_size": page_size,
                "pages": (total_count + page_size - 1) // page_size,
                "has_next": page < ((total_count + page_size - 1) // page_size),
                "has_prev": page > 1
            }
            
            # 카테고리별 개수 추가
            for cat_id in category_ids:
                result_data[f"total_category_{cat_id}_items"] = category_counts.get(cat_id, 0)
            
            return result_data
            
        except Exception as e:
            logger.error(f"검색 결과 조회 중 오류 발생: {str(e)}")
            return {"items": [], "total": 0}
        finally:
            self.close_session()
    
    async def get_place_params(self, id_min: int = 1, id_max: int = 10000) -> List[Dict]:
        """place_list 테이블에서 from_area가 null이 아니고 ID가 지정된 범위 내인 레코드의 param 값을 가져옵니다"""
        try:
            session = self.get_session()
            
            # 쿼리 실행: from_area가 null이 아니고 ID가 범위 내인 레코드 조회
            places = session.query(PlaceList).filter(
                PlaceList.from_area.isnot(None),
                PlaceList.id.between(id_min, id_max)
            ).all()
            
            # 결과 변환
            place_params = []
            for place in places:
                place_params.append({
                    "id": place.id,
                    "param": place.param,
                    "from_area": place.from_area,
                    "sido": place.sido,
                    "sigungu": place.sigungu,
                    "dong": place.dong
                })
            
            logger.info(f"조회된 장소 파라미터: {len(place_params)}개")
            return place_params
            
        except Exception as e:
            logger.error(f"장소 파라미터 조회 중 오류 발생: {str(e)}")
            return []
        finally:
            self.close_session()
    
    async def create_search_process(self, search_request_id: str, place_id: int, param: str, query: str, proxy_info: Optional[Dict] = None) -> Dict:
        """새로운 검색 프로세스를 생성합니다"""
        try:
            session = self.get_session()
            
            # UUID 변환
            try:
                search_request_uuid = uuid.UUID(search_request_id)
            except ValueError:
                logger.error(f"잘못된 검색 요청 ID 형식: {search_request_id}")
                return {}
            
            # 프록시 정보 처리
            proxy_provider = None
            proxy_ip = None
            proxy_country = None
            
            if proxy_info:
                proxy_provider = proxy_info.get("provider", "")
                proxy_ip = proxy_info.get("proxy_address", "")
                proxy_country = proxy_info.get("country", "")
            
            # 검색 프로세스 생성 (start_time은 설정하지 않음)
            current_time = datetime.now(KST)
            search_process = SearchProcess(
                search_request_id=search_request_uuid,
                query=query,
                place_id=place_id,
                param=param,
                is_completed=False,
                # start_time은 실제 검색 시작 시 업데이트됨
                proxy_provider=proxy_provider,
                proxy_ip=proxy_ip,
                proxy_country=proxy_country,
                created_at=current_time,
                updated_at=current_time
            )
            
            session.add(search_process)
            session.commit()
            session.refresh(search_process)
            
            result = {
                "id": search_process.id,
                "search_request_id": str(search_process.search_request_id) if search_process.search_request_id else None,
                "query": search_process.query,
                "place_id": search_process.place_id,
                "param": search_process.param,
                "is_completed": search_process.is_completed,
                "proxy_provider": search_process.proxy_provider,
                "proxy_ip": search_process.proxy_ip,
                "proxy_country": search_process.proxy_country,
                "start_time": search_process.start_time.isoformat() if search_process.start_time else None,
                "created_at": search_process.created_at.isoformat() if search_process.created_at else None
            }
            
            logger.info(f"검색 프로세스 생성 성공: ID {result['id']}")
            return result
            
        except Exception as e:
            if session:
                session.rollback()
            logger.error(f"검색 프로세스 생성 중 오류 발생: {str(e)}")
            return {}
        finally:
            self.close_session()
    
    def _format_error_message(self, error_msg: str, max_length: int = 200) -> str:
        """오류 메시지를 포맷팅합니다"""
        if not error_msg:
            return ""
            
        # 줄바꿈을 공백으로 변환
        formatted_msg = error_msg.replace("\n", " ").strip()
        
        # 너무 긴 메시지는 자르기
        if len(formatted_msg) > max_length:
            formatted_msg = formatted_msg[:max_length] + "..."
            
        return formatted_msg
    
    async def mark_search_process_started(self, process_id: int, proxy_info: Optional[Dict] = None) -> bool:
        """검색 프로세스가 실제로 시작되었음을 기록합니다"""
        try:
            session = self.get_session()
            
            # 검색 프로세스 조회
            process = session.query(SearchProcess).filter(SearchProcess.id == process_id).first()
            
            if not process:
                logger.error(f"검색 프로세스 ID {process_id}를 찾을 수 없습니다.")
                return False
            
            # 시작 시간 업데이트
            process.start_time = datetime.now(KST)
            process.updated_at = datetime.now(KST)
            
            # 프록시 정보 업데이트 (제공된 경우)
            if proxy_info:
                process.proxy_provider = proxy_info.get("provider", process.proxy_provider)
                process.proxy_ip = proxy_info.get("proxy_address", process.proxy_ip)
                process.proxy_country = proxy_info.get("country", process.proxy_country)
            
            session.commit()
            logger.info(f"검색 프로세스 ID {process_id} 시작 시간 기록 ({process.start_time.isoformat()})")
            return True
            
        except Exception as e:
            if session:
                session.rollback()
            logger.error(f"검색 프로세스 시작 시간 업데이트 중 오류 발생: {str(e)}")
            return False
        finally:
            self.close_session()
            
    async def update_search_process(self, process_id: int, is_completed: bool, items_count: int, error_message: Optional[str] = None, proxy_info: Optional[Dict] = None) -> bool:
        """검색 프로세스 상태를 업데이트합니다"""
        try:
            session = self.get_session()
            
            # 검색 프로세스 조회
            process = session.query(SearchProcess).filter(SearchProcess.id == process_id).first()
            
            if not process:
                logger.error(f"검색 프로세스 ID {process_id}를 찾을 수 없습니다.")
                return False
            
            # 오류 메시지 포맷팅
            formatted_error = self._format_error_message(error_message) if error_message else None
            
            # 상태 업데이트
            process.is_completed = is_completed
            process.items_count = items_count
            process.end_time = datetime.now(KST) if is_completed else None
            process.error_message = formatted_error  # 포맷팅된 오류 메시지 저장
            process.updated_at = datetime.now(KST)
            
            # 프록시 정보 업데이트 (제공된 경우)
            if proxy_info:
                process.proxy_provider = proxy_info.get("provider", process.proxy_provider)
                process.proxy_ip = proxy_info.get("proxy_address", process.proxy_ip)
                process.proxy_country = proxy_info.get("country", process.proxy_country)
                logger.info(f"검색 프로세스 ID {process_id}의 프록시 정보 업데이트됨")
            
            session.commit()
            
            # 시작 시간과 종료 시간이 모두 있는 경우, 실행 시간 계산하여 로깅
            if process.start_time and process.end_time:
                execution_time = (process.end_time - process.start_time).total_seconds()
                logger.info(f"검색 프로세스 ID {process_id} 업데이트 성공 (실행 시간: {execution_time:.2f}초)")
            else:
                logger.info(f"검색 프로세스 ID {process_id} 업데이트 성공")
                
            return True
            
        except Exception as e:
            if session:
                session.rollback()
            logger.error(f"검색 프로세스 업데이트 중 오류 발생: {str(e)}")
            return False
        finally:
            self.close_session()
    
    async def get_search_process_status(self, search_request_id: str) -> Dict:
        """특정 검색 요청에 대한 전체 검색 프로세스 진행 상태를 계산합니다"""
        try:
            session = self.get_session()
            
            # UUID 변환
            try:
                search_request_uuid = uuid.UUID(search_request_id)
            except ValueError:
                logger.error(f"잘못된 검색 요청 ID 형식: {search_request_id}")
                return {"total": 0, "completed": 0, "percentage": 0, "total_items": 0}
            
            # 전체 프로세스 수와 완료된 프로세스 수 조회
            total_processes = session.query(SearchProcess).filter(
                SearchProcess.search_request_id == search_request_uuid
            ).count()
            
            completed_processes = session.query(SearchProcess).filter(
                SearchProcess.search_request_id == search_request_uuid,
                SearchProcess.is_completed == True
            ).count()
            
            # 모든 항목 수 계산
            total_items = session.query(SearchProcess).filter(
                SearchProcess.search_request_id == search_request_uuid
            ).with_entities(
                SearchProcess.items_count
            ).all()
            
            total_items_count = sum(item[0] for item in total_items) if total_items else 0
            
            # 백분율 계산
            percentage = (completed_processes / total_processes * 100) if total_processes > 0 else 0
            
            result = {
                "total": total_processes,
                "completed": completed_processes,
                "percentage": round(percentage, 2),
                "total_items": total_items_count
            }
            
            logger.info(f"검색 프로세스 상태: 총 {total_processes}개 중 {completed_processes}개 완료 ({percentage:.2f}%)")
            return result
            
        except Exception as e:
            logger.error(f"검색 프로세스 상태 조회 중 오류 발생: {str(e)}")
            return {"total": 0, "completed": 0, "percentage": 0, "total_items": 0}
        finally:
            self.close_session()
    
    async def get_error_processes(self, search_request_id: str) -> List[Dict]:
        """특정 검색 요청에 대해 오류가 발생한 프로세스 목록을 조회합니다"""
        try:
            session = self.get_session()
            
            # UUID 변환
            try:
                search_request_uuid = uuid.UUID(search_request_id)
            except ValueError:
                logger.error(f"잘못된 검색 요청 ID 형식: {search_request_id}")
                return []
                
            # 오류 메시지가 있는 프로세스 조회
            error_processes = session.query(SearchProcess).filter(
                SearchProcess.search_request_id == search_request_uuid,
                SearchProcess.error_message.isnot(None)
            ).all()
            
            # 결과 변환
            result = []
            for proc in error_processes:
                result.append({
                    "id": proc.id,
                    "place_id": proc.place_id,
                    "param": proc.param,
                    "query": proc.query,
                    "error_message": proc.error_message,
                    "start_time": proc.start_time.isoformat() if proc.start_time else None,
                    "end_time": proc.end_time.isoformat() if proc.end_time else None,
                    "is_completed": proc.is_completed
                })
                
            logger.info(f"검색 요청 ID {search_request_id}에 대해 {len(result)}개의 오류 프로세스를 찾았습니다.")
            return result
            
        except Exception as e:
            logger.error(f"오류 프로세스 조회 중 오류 발생: {str(e)}")
            return []
        finally:
            self.close_session()
    
    def _parse_datetime(self, date_string: str) -> Optional[datetime]:
        """문자열을 datetime 객체로 변환"""
        if not date_string:
            return None
        
        try:
            # ISO 8601 형식 파싱 (2023-04-25T14:30:00+09:00)
            dt = datetime.fromisoformat(date_string.replace('Z', '+00:00'))
            return dt
        except (ValueError, TypeError):
            try:
                # 다른 일반적인 형식 시도
                dt = datetime.strptime(date_string, "%Y-%m-%d %H:%M:%S")
                return dt
            except (ValueError, TypeError):
                return None
    
    def _parse_price(self, price) -> Optional[float]:
        """가격 정보를 숫자로 변환"""
        if price is None:
            return None
        
        if isinstance(price, (int, float)):
            return float(price)
        
        if isinstance(price, str):
            # 문자열에서 숫자만 추출
            try:
                # 콤마와 원 기호 제거
                clean_price = price.replace(',', '').replace('원', '').strip()
                return float(clean_price)
            except (ValueError, TypeError):
                return None
        
        return None
    
    def _search_result_to_dict(self, result: SearchResult) -> Dict[str, Any]:
        """SearchResult 객체를 딕셔너리로 변환"""
        result_dict = {
            "id": str(result.id),
            "query": result.query,
            "title": result.title,
            "link": result.link,
            "thumbnail": result.thumbnail,
            "location": result.location,
            "sido": result.sido,
            "dong_id": result.dong_id,
            "price": result.price,
            "status": result.status,
            "content": result.content,
            "nickname": result.nickname,
            "nickname_id": result.nickname_id,
            "category": result.category,
            "created_at": result.created_at.isoformat() if result.created_at else None,
            "updated_at": result.updated_at.isoformat() if result.updated_at else None,
            "created_at_origin": result.created_at_origin.isoformat() if result.created_at_origin else None,
            "boosted_at": result.boosted_at.isoformat() if result.boosted_at else None,
            "is_new": False  # 기본값으로 False 설정, 새 상품 여부는 나중에 업데이트
        }
        return result_dict
    
    async def get_latest_search_time(self, query: str) -> Optional[datetime]:
        """주어진 쿼리에 대한 가장 최근 검색 시간을 반환합니다 (실제 크롤링된 검색만 고려)"""
        try:
            session = self.get_session()
            
            # 쿼리로 가장 최근 검색 요청 조회 (is_crawled=True인 경우만)
            latest_search = session.query(SearchRequest).filter(
                SearchRequest.query == query,
                SearchRequest.is_crawled == True
            ).order_by(
                SearchRequest.created_at.desc()
            ).first()
            
            if latest_search and latest_search.created_at:
                # 시간을 KST로 변환
                created_at = latest_search.created_at
                if created_at.tzinfo is None:
                    created_at = pytz.UTC.localize(created_at).astimezone(KST)
                else:
                    created_at = created_at.astimezone(KST)
                
                logger.info(f"쿼리 '{query}'의 가장 최근 크롤링 시간: {created_at}")
                return created_at
            
            logger.info(f"쿼리 '{query}'에 대한 크롤링 기록이 없습니다.")
            return None
            
        except Exception as e:
            logger.error(f"최근 검색 시간 조회 중 오류 발생: {str(e)}")
            return None
        finally:
            self.close_session()
    
    async def get_latest_search_request_by_query(self, query: str) -> Optional[Dict]:
        """모든 사용자의 검색 이력에서 특정 쿼리에 대한 가장 최근 검색 요청을 반환합니다 (실제 크롤링된 검색만 고려)"""
        try:
            session = self.get_session()
            
            # 쿼리로 가장 최근 검색 요청 조회 (모든 사용자, is_crawled=True인 경우만)
            latest_search = session.query(SearchRequest).filter(
                SearchRequest.query == query,
                SearchRequest.is_crawled == True
            ).order_by(
                SearchRequest.created_at.desc()
            ).first()
            
            if latest_search:
                # 시간을 KST로 변환
                created_at = latest_search.created_at
                if created_at.tzinfo is None:
                    created_at = pytz.UTC.localize(created_at).astimezone(KST)
                else:
                    created_at = created_at.astimezone(KST)
                
                result = {
                    "id": str(latest_search.id),
                    "user_id": str(latest_search.user_id) if latest_search.user_id else None,
                    "query": latest_search.query,
                    "location": latest_search.location,
                    "created_at": created_at.strftime("%Y-%m-%d %H:%M:%S"),
                    "is_crawled": latest_search.is_crawled
                }
                
                logger.info(f"쿼리 '{query}'에 대한 가장 최근 크롤링 요청을 찾았습니다. ID: {result['id']}")
                return result
            
            logger.info(f"쿼리 '{query}'에 대한 크롤링 요청이 없습니다.")
            return None
            
        except Exception as e:
            logger.error(f"최근 검색 요청 조회 중 오류 발생: {str(e)}")
            return None
        finally:
            self.close_session()
    
    async def get_search_results_by_query(self, query: str) -> List[Dict]:
        """검색어로 직접 검색 결과를 조회합니다. (search_request_id 없이)"""
        try:
            session = self.get_session()
            
            # 로깅을 통한 디버깅 추가
            logger.info(f"query='{query}'로 직접 검색 결과 조회 시작")
            
            # search_results 테이블에서 해당 query와 일치하는 모든 결과 조회
            results = session.query(SearchResult).filter(
                SearchResult.query == query
            ).order_by(
                SearchResult.created_at_origin.desc()
            ).limit(100).all()
            
            # 결과 변환
            search_results = []
            for item in results:
                result_dict = self._search_result_to_dict(item)
                
                # 카테고리 URL과 ID 매핑 (카테고리 URL이 있는 경우)
                category_url_to_id = {
                    "https://dnvefa72aowie.cloudfront.net/origin/category/202306/2c0811ac0c0f491039082d246cd41de636d58cd6e54368a0b012c386645d7c66.png": 1,  # 디지털기기
                    "https://dnvefa72aowie.cloudfront.net/origin/category/202306/ff36d0fb3a3214a9cc86c79a84262e0d9e11b6d7289ed9aa75e40d0129764fac.png": 172,  # 생활가전
                    # 나머지 카테고리 URL 생략 (원본 함수와 동일)
                }
                
                # 카테고리 URL을 ID로 변환
                category_url = item.category
                if category_url in category_url_to_id:
                    result_dict["category_id"] = category_url_to_id[category_url]
                else:
                    result_dict["category_id"] = None
                    
                search_results.append(result_dict)
            
            logger.info(f"쿼리 '{query}'에 대해 {len(search_results)}개의 결과를 직접 조회했습니다.")
            return search_results
            
        except Exception as e:
            logger.error(f"직접 검색 결과 조회 중 오류 발생: {str(e)}")
            import traceback
            logger.error(f"상세 오류 정보: {traceback.format_exc()}")
            return []
        finally:
            self.close_session() 