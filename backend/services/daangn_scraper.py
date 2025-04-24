import aiohttp
import re
import json
from datetime import datetime
from typing import List, Dict, Optional, Tuple, Any
import logging
import asyncio

# 로깅 설정
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ProxyProvider:
    """프록시 제공 업체 기본 클래스"""
    
    def __init__(self, name: str):
        self.name = name
        self.proxies = []
    
    async def get_proxies(self) -> List[Dict]:
        """프록시 목록을 가져옵니다"""
        raise NotImplementedError("이 메서드는 하위 클래스에서 구현해야 합니다")
    
    def format_proxy_url(self, proxy: Dict) -> str:
        """프록시 정보를 URL 형식으로 반환합니다"""
        raise NotImplementedError("이 메서드는 하위 클래스에서 구현해야 합니다")

class OxylabsProvider(ProxyProvider):
    """Oxylabs 프록시 서비스 클래스"""
    
    def __init__(self, username: str = "oxyclean_MwHOU", password: str = "qkg0ADN1vxp6yca_pqx"):
        super().__init__("oxylabs")
        self.username = username
        self.password = password
        self.proxy_host = "dc.oxylabs.io"
        # 일본 IP와 포트 정보 매핑
        self.japan_proxies = [
            {"port": 8001, "ip": "173.211.16.163"},
            {"port": 8002, "ip": "173.211.16.164"},
            {"port": 8003, "ip": "173.211.16.196"},
            {"port": 8004, "ip": "173.211.16.5"},
            {"port": 8005, "ip": "173.211.16.84"},
            {"port": 8006, "ip": "173.211.29.155"},
            {"port": 8007, "ip": "45.39.152.163"},
            {"port": 8008, "ip": "45.39.152.168"},
            {"port": 8009, "ip": "45.39.152.214"},
            {"port": 8010, "ip": "45.39.152.88"}
        ]
        # 첫 번째 프록시 포트 선택
        self.proxy_port = self.japan_proxies[0]["port"]
        self.assigned_ip = self.japan_proxies[0]["ip"]
        self.country = "JP"  # 국가 코드를 JP로 고정
    
    async def get_proxies(self) -> List[Dict]:
        """Oxylabs 프록시 정보를 가져옵니다 - 국가 코드 JP로 고정"""
        try:
            # 일본 프록시 리스트 생성
            self.proxies = []
            
            for proxy_info in self.japan_proxies:
                proxy = {
                    "provider": self.name,
                    "country": self.country,
                    "username": self.username,
                    "password": self.password,
                    "proxy_address": proxy_info["ip"],
                    "port": proxy_info["port"],
                    "proxy_host": self.proxy_host
                }
                self.proxies.append(proxy)
            
            logger.info(f"Oxylabs 일본 프록시가 설정되었습니다: {len(self.proxies)}개 (포트 8001-8010)")
            return self.proxies
            
        except Exception as e:
            logger.error(f"Oxylabs 프록시 설정 중 오류 발생: {e}")
            return []
    
    def format_proxy_url(self, proxy: Dict) -> str:
        """프록시 정보를 URL 형식으로 반환합니다"""
        if not proxy:
            return ""
        
        username = f"user-{self.username}-country-{self.country}"
        password = self.password
        proxy_host = self.proxy_host
        proxy_port = proxy.get("port")
        
        if not all([username, password, proxy_host, proxy_port]):
            return ""
        
        return f"http://{username}:{password}@{proxy_host}:{proxy_port}"

class ProxyService:
    """프록시 서비스 관리 클래스"""
    
    def __init__(self):
        self.providers = [
            OxylabsProvider()  # WebshareProvider 제거, Oxylabs만 사용
        ]
        self.all_proxies = []  # 모든 프록시 목록
        self.current_index = 0  # 현재 사용 중인 프록시 인덱스
    
    async def initialize(self):
        """모든 프록시 제공자를 초기화하고 프록시 목록을 가져옵니다"""
        all_proxies = []
        
        # 모든 프록시 제공자에서 프록시 목록 가져오기
        for provider in self.providers:
            try:
                proxies = await provider.get_proxies()
                if proxies:
                    all_proxies.extend(proxies)
                    logger.info(f"{provider.name}에서 {len(proxies)}개의 프록시를 가져왔습니다")
            except Exception as e:
                logger.error(f"{provider.name} 프록시 가져오기 실패: {e}")
        
        if not all_proxies:
            logger.error("사용 가능한 프록시가 없습니다")
            raise Exception("모든 프록시 제공자에서 프록시를 가져오지 못했습니다")
        
        self.all_proxies = all_proxies
        logger.info(f"총 {len(self.all_proxies)}개의 프록시를 초기화했습니다")
        return self.all_proxies
    
    def get_proxy(self) -> Tuple[Dict, str]:
        """현재 인덱스의 프록시와 URL을 반환합니다"""
        if not self.all_proxies:
            return {}, ""
        
        # 현재 인덱스의 프록시 가져오기
        proxy = self.all_proxies[self.current_index]
        
        # 해당 프록시의 제공자 찾기
        provider_name = proxy.get("provider", "")
        provider = next((p for p in self.providers if p.name == provider_name), None)
        
        if not provider:
            logger.error(f"프록시 {proxy}의 제공자를 찾을 수 없습니다")
            return {}, ""
        
        # 프록시 URL 생성
        proxy_url = provider.format_proxy_url(proxy)
        
        return proxy, proxy_url
    
    def get_next_proxy(self) -> Tuple[Dict, str]:
        """현재 인덱스를 증가시키고 다음 프록시를 반환합니다"""
        # 인덱스 증가 (순환)
        self.current_index = (self.current_index + 1) % len(self.all_proxies)
        return self.get_proxy()

class DaangnScraper:
    """당근마켓 검색 결과를 가져오는 클래스"""
    
    BASE_URL = "https://www.daangn.com/kr/buy-sell/"
    
    def __init__(self, location: str = "", use_proxy: bool = True):
        self.location = location
        self.use_proxy = True  # 항상 프록시 사용 (use_proxy 파라미터 무시)
        self.proxy_service = ProxyService()
        self.proxy = None
        self.proxy_url = None
        
        # 반드시 headers를 먼저 초기화
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        }
        
    async def setup_proxy(self):
        """프록시 설정을 초기화합니다"""
        # 모든 프록시 제공자 초기화
        await self.proxy_service.initialize()
        
        # 첫 번째 프록시 가져오기
        self.proxy, self.proxy_url = self.proxy_service.get_proxy()
        
        if not self.proxy or not self.proxy_url:
            logger.error("유효한 프록시를 가져올 수 없습니다")
            raise Exception("프록시 설정 실패")
        
        # 실제 IP 주소 가져오기
        real_ip = await self._get_real_ip()
        if real_ip:
            # 실제 IP 주소를 real_ip 필드에 저장
            self.proxy["real_ip"] = real_ip
            # DB 서비스와의 호환성을 위해 proxy_address 필드에도 저장
            self.proxy["proxy_address"] = real_ip
            logger.info(f"실제 IP 주소를 가져왔습니다: {real_ip}")
            
        logger.info(f"프록시가 설정되었습니다: {self.proxy.get('provider', '')} / {self.proxy.get('country', '')} / {self.proxy.get('real_ip', '알 수 없음')}:{self.proxy.get('port', '')}")
    
    async def _get_real_ip(self) -> str:
        """실제 프록시 IP 주소를 가져옵니다"""
        try:
            async with aiohttp.ClientSession() as session:
                kwargs = {
                    "headers": self.headers,
                    "timeout": aiohttp.ClientTimeout(total=10),
                    "proxy": self.proxy_url
                }
                
                async with session.get("https://ip.oxylabs.io/location", **kwargs) as response:
                    if response.status != 200:
                        logger.error(f"실제 IP 주소 가져오기 실패: 상태 코드 {response.status}")
                        return ""
                    
                    data = await response.json()
                    real_ip = data.get("ip", "")
                    
                    if not real_ip:
                        logger.error("응답에서 IP 주소를 찾을 수 없습니다")
                        return ""
                    
                    return real_ip
                    
        except Exception as e:
            logger.error(f"실제 IP 주소 가져오기 중 오류 발생: {e}")
            return ""
    
    async def switch_to_next_proxy(self) -> bool:
        """다음 프록시로 전환합니다"""
        logger.info("다음 프록시로 전환 시도 중...")
        
        # 다음 프록시 가져오기
        self.proxy, self.proxy_url = self.proxy_service.get_next_proxy()
        
        if not self.proxy or not self.proxy_url:
            logger.error("다음 프록시를 가져올 수 없습니다")
            return False
        
        # 실제 IP 주소 가져오기
        real_ip = await self._get_real_ip()
        if real_ip:
            self.proxy["real_ip"] = real_ip
            # DB 서비스와의 호환성을 위해 proxy_address 필드에도 저장
            self.proxy["proxy_address"] = real_ip
        
        logger.info(f"새 프록시로 전환 성공: {self.proxy.get('provider', '')} / {self.proxy.get('country', '')} / {self.proxy.get('real_ip', '알 수 없음')}")
        return True
    
    async def search(self, query: str) -> List[Dict]:
        """검색어로 당근마켓 검색 결과를 가져옵니다"""
        if not self.proxy or not self.proxy_url:
            logger.error("프록시가 설정되지 않았습니다. 크롤링을 중단합니다.")
            return []
            
        url = f"{self.BASE_URL}?in={self.location}&search={query}"
        logger.info(f"검색 URL: {url}")
        
        try:
            async with aiohttp.ClientSession() as session:
                kwargs = {
                    "headers": self.headers,
                    "timeout": aiohttp.ClientTimeout(total=10),
                    "allow_redirects": False,  # 리다이렉트 비활성화
                    "proxy": self.proxy_url  # 항상 프록시 사용
                }
                
                logger.info(f"프록시를 사용하여 크롤링합니다: {self.proxy.get('provider', '')} / {self.proxy.get('country', '')} / {self.proxy.get('real_ip', '알 수 없음')}")
                
                async with session.get(url, **kwargs) as response:
                    # 429 Too Many Requests 에러 발생 시 명시적으로 예외 발생
                    if response.status == 429:
                        error_msg = f"HTTP 429 에러 (Too Many Requests): {url}"
                        logger.error(error_msg)
                        raise aiohttp.ClientResponseError(
                            request_info=response.request_info,
                            history=response.history,
                            status=429,
                            message="Too Many Requests",
                            headers=response.headers
                        )
                    
                    if response.status != 200:
                        error_msg = f"데이터 가져오기 실패: 상태 코드 {response.status} - {url}"
                        logger.error(error_msg)
                        raise aiohttp.ClientResponseError(
                            request_info=response.request_info,
                            history=response.history,
                            status=response.status,
                            message=f"HTTP Error: {response.status}",
                            headers=response.headers
                        )
                    
                    # 응답 텍스트 가져오기
                    text = await response.text('utf-8')
                    
                    # 디버깅을 위해 HTML 저장
                    with open("last_search_response.html", "w", encoding="utf-8") as f:
                        f.write(text)
                    logger.info("응답 HTML이 'last_search_response.html'에 저장되었습니다.")
                    
                    # JSON 데이터 추출
                    results = self._extract_json_data(text, query)
                    
                    if not results:
                        logger.warning("검색 결과가 없습니다.")
                        return []
                    
                    logger.info(f"성공적으로 파싱된 항목 수: {len(results)}")
                    return results
            
        except aiohttp.ClientProxyConnectionError as e:
            # 프록시 오류는 명시적으로 잡아서 처리
            logger.error(f"프록시 연결 오류 발생: {e}")
            raise Exception(f"프록시 연결 오류: {str(e)}")
        except aiohttp.ClientResponseError as e:
            # HTTP 응답 오류를 명확히 전달
            logger.error(f"HTTP 응답 오류 발생: {e.status}, message='{e.message}', url={e.request_info.url}")
            raise
        except aiohttp.ClientConnectionError as e:
            # 연결 오류도 명시적으로 처리
            logger.error(f"연결 오류 발생 (프록시 관련 문제일 수 있음): {e}")
            raise Exception(f"연결 오류: {str(e)}")
        except Exception as e:
            logger.error(f"검색 중 오류 발생: {str(e)}")
            raise
    
    def _extract_json_data(self, html_content: str, query: str) -> List[Dict]:
        """HTML에서 JSON 데이터를 추출하고 검색 결과를 반환합니다"""
        try:
            # 결과 데이터가 없는 경우 검사
            if not html_content or len(html_content) < 100:
                error_msg = f"HTML 응답 내용이 비어있거나 너무 짧습니다: {len(html_content)} 바이트"
                logger.error(error_msg)
                raise ValueError(error_msg)
                
            # JSON 데이터 추출을 위한 정규식 패턴
            # window.__remixContext의 JSON 블록을 찾기
            pattern = r'window\.__remixContext\s*=\s*({.*?});\s*</script>'
            
            # 정규식을 이용하여 JSON 데이터 추출
            match = re.search(pattern, html_content, re.DOTALL)
            
            if not match:
                # 패턴이 일치하지 않는 경우 (사이트 구조 변경 가능성)
                error_msg = "JSON 데이터 패턴을 찾을 수 없습니다. 사이트 구조가 변경되었을 수 있습니다."
                logger.error(error_msg)
                
                # 디버깅을 위해 짧은 HTML 샘플 로깅
                html_sample = html_content[:500] + "..." if len(html_content) > 500 else html_content
                logger.debug(f"HTML 응답 샘플: {html_sample}")
                
                raise ValueError(error_msg)
            
            json_data_str = match.group(1)
            
            try:
                json_data = json.loads(json_data_str)
            except json.JSONDecodeError as json_err:
                error_msg = f"JSON 데이터 파싱 실패: {str(json_err)}"
                logger.error(error_msg)
                
                # JSON 문자열 일부 샘플 로깅
                json_sample = json_data_str[:200] + "..." if len(json_data_str) > 200 else json_data_str
                logger.debug(f"JSON 데이터 샘플: {json_sample}")
                
                raise ValueError(error_msg) from json_err
            
            # fleamarketArticles 데이터 추출
            try:
                # 데이터 구조가 변경된 경우를 대비한 안전한 접근
                state_data = json_data.get("state", {})
                loader_data = state_data.get("loaderData", {})
                
                # 키가 존재하는지 확인 후 안전하게 접근
                if "routes/kr.buy-sell._index" not in loader_data:
                    available_keys = list(loader_data.keys())
                    error_msg = f"routes/kr.buy-sell._index 키를 찾을 수 없습니다. 가능한 키: {available_keys}"
                    logger.error(error_msg)
                    raise KeyError(error_msg)
                
                route_data = loader_data.get("routes/kr.buy-sell._index", {})
                all_page_data = route_data.get("allPage", {})
                
                if "fleamarketArticles" not in all_page_data:
                    available_keys = list(all_page_data.keys())
                    error_msg = f"fleamarketArticles 키를 찾을 수 없습니다. 가능한 키: {available_keys}"
                    logger.error(error_msg)
                    raise KeyError(error_msg)
                
                articles = all_page_data.get("fleamarketArticles", [])
                logger.info(f"fleamarketArticles에서 {len(articles)}개의 항목을 찾았습니다.")
                
                if not articles:
                    logger.warning(f"쿼리 '{query}'에 대한 검색 결과가 없습니다.")
                
            except KeyError as e:
                error_msg = f"JSON 구조에서 필요한 키를 찾을 수 없습니다: {str(e)}"
                logger.error(error_msg)
                
                # 디버깅을 위한 추가 정보 로깅
                if "state" in json_data:
                    loader_keys = list(json_data.get("state", {}).get("loaderData", {}).keys())
                    logger.debug(f"loaderData에서 사용 가능한 키: {loader_keys}")
                
                raise ValueError(error_msg) from e
            
            results = []
            for article in articles:
                try:
                    # 가격을 숫자로 변환
                    price_value = None
                    if "price" in article:
                        try:
                            price_value = float(article["price"])
                        except (ValueError, TypeError):
                            # 가격 형식이 다른 경우 처리
                            price_text = str(article["price"])
                            # 숫자만 추출
                            numbers = re.findall(r'\d+', price_text)
                            if numbers:
                                price_value = float("".join(numbers))
                    
                    # 필수 필드 확인
                    if "href" not in article:
                        logger.warning(f"항목에 'href' 필드가 없습니다: {article}")
                        continue
                        
                    if "title" not in article:
                        logger.warning(f"항목에 'title' 필드가 없습니다: {article}")
                    
                    # 닉네임과 ID 추출
                    nickname = article.get("user", {}).get("nickname", "")
                    nickname_id = article.get("user", {}).get("dbId", "")
                    
                    # 지역 정보 추출 (dong_id 포함)
                    region_id = article.get("regionId", {})
                    location = region_id.get("name", "위치 정보 없음")
                    dong_id = region_id.get("dbId", "")
                    
                    # 지역 정보가 포함된 링크 URL 생성
                    original_href = article.get("href", "")
                    modified_href = original_href
                    
                    # 링크에 지역 파라미터 추가
                    if dong_id and location:
                        # URL 형식에 따라 수정
                        if "?" in modified_href:
                            modified_href = f"{modified_href}&in={location}-{dong_id}"
                        else:
                            modified_href = f"{modified_href}?in={location}-{dong_id}"
                        logger.debug(f"링크 URL 수정: {original_href} -> {modified_href}")
                    
                    # 카테고리 이미지 URL 추출
                    category_thumbnail = article.get("category", {}).get("thumbnail", "")
                    
                    # 필수 필드가 없는 경우의 기본값 설정
                    title = article.get("title", "제목 없음")
                    link = modified_href  # 수정된 링크 사용
                    
                    # 결과 추가
                    results.append({
                        "link": link,
                        "title": title,
                        "price": price_value,
                        "status": article.get("status", ""),
                        "content": article.get("content", ""),
                        "thumbnail": article.get("thumbnail", ""),
                        "location": location,
                        "dong_id": dong_id,  # dong_id 추가
                        "nickname": nickname,
                        "nickname_id": nickname_id,
                        "category": category_thumbnail,
                        "created_at_origin": article.get("createdAt", ""),
                        "boosted_at": article.get("boostedAt", ""),
                        "search_query": query,
                        "search_time": datetime.now().isoformat()
                    })
                    
                    logger.debug(f"파싱된 항목: {title}")
                    
                except Exception as e:
                    logger.error(f"항목 파싱 중 오류: {str(e)}")
                    # 개별 항목 파싱 오류는 건너뛰고 나머지 항목 계속 처리
                    continue
            
            if not results and articles:
                logger.warning(f"항목은 {len(articles)}개 찾았으나 모두 파싱에 실패했습니다.")
            
            return results
            
        except Exception as e:
            error_msg = f"JSON 데이터 추출 중 오류: {str(e)}"
            logger.error(error_msg)
            # 호출자에게 문제를 전파하기 위해 다시 예외 발생
            raise ValueError(error_msg) from e

    async def get_raw_html(self, query: str) -> str:
        """디버깅용: 검색 결과의 원본 HTML을 반환합니다"""
        if not self.proxy or not self.proxy_url:
            logger.error("프록시가 설정되지 않았습니다. 크롤링을 중단합니다.")
            return ""
            
        url = f"{self.BASE_URL}?in={self.location}&search={query}"
        
        try:
            async with aiohttp.ClientSession() as session:
                kwargs = {
                    "headers": self.headers,
                    "timeout": aiohttp.ClientTimeout(total=10),
                    "allow_redirects": False,
                    "proxy": self.proxy_url  # 항상 프록시 사용
                }
                
                logger.info(f"프록시를 사용하여 크롤링합니다: {self.proxy.get('provider', '')} / {self.proxy.get('country', '')} / {self.proxy.get('real_ip', '알 수 없음')}")
                
                async with session.get(url, **kwargs) as response:
                    if response.status == 200:
                        text = await response.text('utf-8')
                        
                        # 파일로도 저장
                        with open(f"daangn_search_{query}.html", "w", encoding="utf-8") as f:
                            f.write(text)
                        return text
                    else:
                        logger.error(f"HTML 가져오기 실패: 상태 코드 {response.status}")
                        return ""
        except aiohttp.ClientProxyConnectionError as e:
            # 프록시 오류는 명시적으로 잡아서 처리
            logger.error(f"프록시 연결 오류 발생: {e}")
            return ""
        except aiohttp.ClientConnectionError as e:
            # 연결 오류도 명시적으로 처리
            logger.error(f"연결 오류 발생 (프록시 관련 문제일 수 있음): {e}")
            return ""
        except Exception as e:
            logger.error(f"HTML 가져오기 중 오류: {e}")
            return ""

# 테스트 코드
if __name__ == "__main__":
    async def test_scraper():
        # 프록시 사용 옵션을 True로 설정
        scraper = DaangnScraper(use_proxy=True)
        await scraper.setup_proxy()  # 비동기 초기화 호출
        
        # 실제 검색 테스트
        results = await scraper.search("닌텐도")
        
        print(f"\n총 {len(results)}개의 결과를 찾았습니다.")
        for i, result in enumerate(results):
            print(f"\n--- 결과 {i+1} ---")
            print(f"제목: {result['title']}")
            print(f"가격: {result['price']}")
            print(f"상태: {result['status']}")
            print(f"내용: {result['content'][:50]}..." if len(result.get('content', '')) > 50 else f"내용: {result.get('content', '')}")
            print(f"닉네임: {result['nickname']} (ID: {result['nickname_id']})")
            print(f"등록일: {result['created_at_origin']}")
            print(f"부스트 시간: {result['boosted_at']}")
            print(f"링크: {result['link']}")
            print(f"썸네일: {result['thumbnail']}")
            print(f"위치: {result['location']}")
    
    asyncio.run(test_scraper()) 