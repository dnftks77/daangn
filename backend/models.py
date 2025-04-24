from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List, Dict, Union, Literal
from datetime import datetime
import uuid

# 사용자 등록 모델
class UserCreate(BaseModel):
    email: EmailStr
    password: str

# 로그인 모델
class UserLogin(BaseModel):
    email: EmailStr
    password: str

# 토큰 응답 모델
class Token(BaseModel):
    access_token: str
    token_type: str

# 사용자 정보 모델
class User(BaseModel):
    id: str
    email: EmailStr
    created_at: Optional[datetime] = None
    last_sign_in_at: Optional[str] = None

# 사용자 목록 모델
class UserList(BaseModel):
    users: List[User]

# 검색 요청 모델
class SearchRequest(BaseModel):
    query: str
    location: Optional[str] = "전국"

# 검색 결과 필터링 및 페이징 모델
class SearchFilter(BaseModel):
    sort_by: Optional[Literal["created_at_desc", "price_asc"]] = "created_at_desc"  # 최신순, 가격낮은순
    only_available: Optional[bool] = False  # 거래 가능한 상품만
    page: Optional[int] = 1
    page_size: Optional[int] = 20
    query: Optional[str] = None  # 쿼리는 선택 사항(특정 검색 ID로 조회 시)

# 검색 결과 아이템 모델
class SearchResultItem(BaseModel):
    title: str
    price: Optional[Union[str, float, int]] = None
    link: str
    location: Optional[str] = None
    sido: Optional[str] = None
    content: Optional[str] = None
    thumbnail: Optional[str] = None
    created_at_origin: Optional[str] = None
    boosted_at: Optional[str] = None
    nickname: Optional[str] = None
    status: Optional[str] = None
    category_id: Optional[int] = None
    is_new: Optional[bool] = False  # 새로운 상품 여부

# 페이징 정보 모델
class PaginationInfo(BaseModel):
    current_page: int
    total_pages: int
    page_size: int
    total_items: int
    has_next: bool
    has_prev: bool

# 검색 결과 응답 모델 (페이징 지원)
class SearchResponse(BaseModel):
    request_id: str
    results: List[SearchResultItem]
    pagination: PaginationInfo
    category_total_items: Dict[str, int] = {}

# 데이터베이스 모델
class SearchResult(BaseModel):
    id: Optional[str] = None
    query: str
    title: str
    price: Union[float, int, str]
    link: str
    location: str
    sido: Optional[str] = None
    content: str
    thumbnail: str
    created_at_origin: str
    boosted_at: Optional[str] = None
    nickname: str
    status: Optional[str] = None
    created_at: Optional[datetime] = None
    
# 최근 검색어 응답 모델
class RecentSearchResponse(BaseModel):
    query: str
    created_at: datetime 