import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { isAuthenticated, getCurrentUser, checkAdminStatus } from '../services/auth';

// 카테고리 이미지 임포트
import digitalImg from '../assets/2c0811ac0c0f491039082d246cd41de636d58cd6e54368a0b012c386645d7c66.png';
import applianceImg from '../assets/ff36d0fb3a3214a9cc86c79a84262e0d9e11b6d7289ed9aa75e40d0129764fac.png';
import furnitureImg from '../assets/088e41c5973184228a2e4a50961ceb6fc366bb3eb11b1ee7c7cd66bcdf9c5529.png';
import livingImg from '../assets/22a78937b8a8ccd0003ff7bb7c247b3863a5046f93a36b5341913ff2935efa43.png';
import kidsImg from '../assets/1975d6ba1725dfbe053daa450cec51757a39943104d57fbdd3fc5c7d8ae07605.png';
import kidsBooksImg from '../assets/987b21e9e02255cb310e4736b16e056d0bfc90c397e423e599b544bad203601e.png';
import womenClothingImg from '../assets/b99fb12bcc754a08e5a6f359861bafd80d38678a0c58521abdf314949f9c5e58.png';
import womenAccessoriesImg from '../assets/23f6b89ba63da7cf8135e1063bde3811fb6499dc073585eea161b3727a42535e.png';
import menFashionImg from '../assets/38dd757c99863d1748f16292142cabfae9621622cc751faff49a79ed60c1c5e7.png';
import beautyImg from '../assets/1efa73a4e3b45610292223f44c42cbe3c7d93395a23f1134426a58d5639c179b.png';
import sportsImg from '../assets/6379c3ba41f03dc6e27796c5f106c8b20b57d79ddb3ba52440084fcd4d10d8dd.png';
import hobbyImg from '../assets/074da39b1114588ebc61447883f5f0059dd4abc16127f4250f559360f40eb0e2.png';
import booksImg from '../assets/0ce93f6b19d61169b955dae5422aa9f842933d8ccf35dc4c53cea8656a293e40.png';
import ticketsImg from '../assets/631cb98e2c7cf46f1f2520f97b0ec2d30ce426c4c158ea3673f84e0aca088181.png';
import foodImg from '../assets/243b21522a5ff57863942f0ed84a04b3cc72f30ca9edda818f31238fc94066ee.png';
import healthFoodImg from '../assets/c22153f3cca52c69efb2b4c15e8e644ea7118b2f8c07d378ec8b75489c31cf46.png';
import petImg from '../assets/763d2fb8809deb0a5ebd4ef2694ecb2d8b08f501ab185f7167d87a74a33aee10.png';
import plantImg from '../assets/248610f466d99a9a7cafa1c75a818a73bf850e05c7f7c205cbc60c7b7b16f876.png';
import otherImg from '../assets/407b005b01de954b59aff9e21f729b3c30e3ae249acfb643401f235598dea8e3.png';
import buyImg from '../assets/6a729d83f311aa3e8ffa12c9757cfda323591a0018ce2d25da6bf604615e33c2.png';

// 검색 결과 타입 정의
interface SearchResultItem {
  title: string;
  price: string | number | null | undefined;
  link: string;
  location: string;
  sido: string;
  content: string;
  thumbnail: string;
  created_at_origin: string;
  boosted_at: string;
  nickname: string;
  status: string;
  category: string;
  category_id?: number;
  is_new?: boolean;  // 새로운 상품 여부
}

// 디버그 정보 인터페이스 추가
interface DebugInfo {
  containerWidth: number;
  tagWidths: number[];
  tagHeights: number[];
  visibleCount: number;
  needMoreButton: boolean;
  isBrowserWider: boolean;
  moreButtonWidth: number;
  windowWidth: number;
}

// 카테고리 정의
interface Category {
  id: number;
  name: string;
  image: string;
}

// 카테고리 목록
const CATEGORIES: Category[] = [
  { id: 1, name: "디지털기기", image: digitalImg },
  { id: 172, name: "생활가전", image: applianceImg },
  { id: 8, name: "가구/인테리어", image: furnitureImg },
  { id: 7, name: "생활/주방", image: livingImg },
  { id: 4, name: "유아동", image: kidsImg },
  { id: 173, name: "유아도서", image: kidsBooksImg },
  { id: 5, name: "여성의류", image: womenClothingImg },
  { id: 31, name: "여성잡화", image: womenAccessoriesImg },
  { id: 14, name: "남성패션/잡화", image: menFashionImg },
  { id: 6, name: "뷰티/미용", image: beautyImg },
  { id: 3, name: "스포츠/레저", image: sportsImg },
  { id: 2, name: "취미/게임/음반", image: hobbyImg },
  { id: 9, name: "도서", image: booksImg },
  { id: 304, name: "티켓/교환권", image: ticketsImg },
  { id: 305, name: "가공식품", image: foodImg },
  { id: 483, name: "건강기능식품", image: healthFoodImg },
  { id: 16, name: "반려동물용품", image: petImg },
  { id: 139, name: "식물", image: plantImg },
  { id: 13, name: "기타 중고물품", image: otherImg },
  { id: 32, name: "삽니다", image: buyImg },
];

// 최근 검색 이력 타입 정의
interface RecentSearch {
  id: string;
  query: string;
  location: string;
  created_at: string;
  user_id: string;
  progress?: number;
  total_items?: number;
  is_completed?: boolean;
  failed_processes?: number;
}

// 검색 상태 타입 정의
interface SearchStatus {
  search_id: string;
  total_processes: number;
  completed_processes: number;
  failed_processes?: number;
  completion_percentage: number;
  total_items_found: number;
  is_completed: boolean;
  error_processes?: any[];
}

// 최근 검색 시간 정보 타입 정의
interface LatestSearchTime {
  query: string;
  has_results: boolean;
  latest_time: string | null;
}

function Home() {
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearched, setIsSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [currentSearchId, setCurrentSearchId] = useState<string | null>(null);
  const [searchStatus, setSearchStatus] = useState<SearchStatus | null>(null);
  const [pollingInterval, setPollingInterval] = useState<number | null>(null);
  const [updatedItems, setUpdatedItems] = useState<string[]>([]);
  const searchResultsRef = useRef<SearchResultItem[]>([]);
  const [searchMode, setSearchMode] = useState<'new' | 'existing'>('new');
  const [latestSearchTime, setLatestSearchTime] = useState<LatestSearchTime | null>(null);
  
  // 검색 결과 뷰 모드 추가
  const [viewMode, setViewMode] = useState<'gallery' | 'list'>('gallery');
  
  // 정렬 및 필터 상태
  const [sortBy, setSortBy] = useState<'created_at_desc' | 'price_asc'>('created_at_desc');
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<number[]>([]);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  
  // 무한 스크롤 관련 상태
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [pagination, setPagination] = useState<any>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  // 검색 결과 영역 ref 추가
  const searchResultsMainRef = useRef<HTMLDivElement | null>(null);
  // 스크롤 관련 상태 추가
  const [isUserScrolling, setIsUserScrolling] = useState<boolean>(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const delayedScrollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 자동 스크롤 제어를 위한 레퍼런스 추가
  const isAutoScrollingRef = useRef<boolean>(false);
  const scrollAnimationFrameRef = useRef<number | null>(null);

  // 카테고리별 아이템 개수를 저장할 상태 추가
  const [categoryCount, setCategoryCount] = useState<Record<number, number>>({});

  // 좌측 필터 컬럼 모달 상태
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);
  
  // 스켈레톤 UI를 위한 상태 추가
  const [isLoadingSkeleton, setIsLoadingSkeleton] = useState(false);
  const skeletonItemsCount = 12; // 스켈레톤 아이템 개수
  
  // 디버그 정보 표시 여부 상태
  const [showDebugInfo, setShowDebugInfo] = useState<boolean>(true);
  
  // 최근 검색어 모두 보기 상태
  const [showAllRecentSearches, setShowAllRecentSearches] = useState<boolean>(false);
  
  // 화면 가로 너비 상태
  const [screenWidth, setScreenWidth] = useState<number>(window.innerWidth);
  
  // 최근 검색어 태그를 측정하기 위한 refs
  const tagsContainerRef = useRef<HTMLDivElement>(null);
  const [visibleTagsCount, setVisibleTagsCount] = useState<number>(40);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null); // 디버그 정보 상태

  // 최초 검색 실행 여부를 추적하는 ref
  const initialSearchPerformed = useRef(false);
  const initialRenderRef = useRef(true);
  const searchFormRef = useRef<HTMLFormElement>(null); // 검색 폼 참조 추가
  const searchButtonRef = useRef<HTMLButtonElement>(null); // 검색 버튼 참조 추가

  // URL에서 검색어 파라미터를 가져와 검색 실행 (단일 useEffect로 통합)
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const queryFromUrl = queryParams.get('q');
    const useExisting = queryParams.get('use_existing') === 'true';
    
    // 검색어가 있을 때만 실행
    if (queryFromUrl) {
      console.log('URL에서 검색어 감지:', queryFromUrl);
      console.log('use_existing 파라미터:', useExisting);
      
      // 검색어 설정
      setSearchTerm(queryFromUrl);
      
      // 약간의 지연을 두고 검색 실행 (컴포넌트가 마운트된 후)
      setTimeout(() => {
        initialRenderRef.current = false;
        initialSearchPerformed.current = true;
        
        // 기존 결과 사용 모드로 설정
        if (useExisting) {
          setSearchMode('existing');
          console.log('[디버그] 기존 결과 사용 모드로 검색 시작:', queryFromUrl);
          
          // 기존 검색 결과를 표시하기 위한 내부 함수 호출
          searchWithExisting(queryFromUrl);
        } else {
          setSearchMode('new');
          console.log('[디버그] 새 검색 모드로 검색 시작:', queryFromUrl);
          
          // 다양한 방법으로 검색 실행 시도
          // 1. 검색 버튼 직접 클릭 시도
          if (searchButtonRef.current) {
            console.log('[디버그] 검색 버튼 직접 클릭 시도');
            searchButtonRef.current.click();
            return;
          }
          
          // 2. 폼 직접 제출 시도
          if (searchFormRef.current) {
            console.log('[디버그] 검색 폼 직접 제출 시도');
            searchFormRef.current.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            return;
          }
          
          // 3. 함수 직접 호출 시도
          console.log('[디버그] handleSearch 함수 직접 호출 시도');
          handleSearch({ preventDefault: () => {} } as React.FormEvent);
        }
      }, 300);
    }
  }, [location.search]); // 종속성 배열
  
  // 기존 결과 사용 모드로 검색을 실행하는 내부 함수
  const searchWithExisting = async (query: string) => {
    if (!query.trim()) return;
    
    console.log(`[디버그] 기존 결과로 검색: "${query}"`);
    
    setIsSearched(true);
    setSearchError(null);
    setCurrentSearchId(null);
    setSearchStatus(null);
    setUpdatedItems([]);
    setLoading(true);
    
    // 카테고리 필터 초기화 - 검색어 변경 시 항상 초기화
    setSelectedCategory([]);
    
    try {
      // 최근 검색 시간 정보 조회
      const latestTime = await fetchLatestSearchTime(query);
      setLatestSearchTime(latestTime);
      console.log(`[디버그] 최근 검색 시간:`, latestTime);
      
      // 1. 최근 검색 이력에서 일치하는 ID 찾기 (필터링에 필요)
      console.log(`[디버그] 최근 검색 이력에서 검색 ID 찾기`);
      const recentSearches = await fetchRecentSearches();
      const matchingSearch = recentSearches.find((s: RecentSearch) => 
        s.query.toLowerCase().trim() === query.toLowerCase().trim()
      );
      
      // 2. 빠른 결과 표시를 위해 기존 검색 결과 가져오기
      console.log(`[디버그] 기존 검색 결과 가져오기`);
      const existingResults = await fetchExistingResults(query);
      
      // 빠른 결과 표시 (있는 경우)
      if (existingResults && existingResults.length > 0) {
        console.log(`[디버그] 기존 검색 결과 ${existingResults.length}개 로드됨`);
        setSearchResults(existingResults);
        searchResultsRef.current = existingResults;
      } else {
        console.log(`[디버그] 기존 검색 결과 없음`);
        setSearchResults([]);
        searchResultsRef.current = [];
      }
      
      // 검색 ID가 있는 경우 - 카테고리 정보와 필터링을 위해 필수
      if (matchingSearch) {
        console.log(`[디버그] 검색 ID 발견: ${matchingSearch.id}`);
        setCurrentSearchId(matchingSearch.id);
        
        // 검색 결과 로드 (정렬, 필터링, 카테고리 정보 포함)
        console.log(`[디버그] 검색 ID로 카테고리 정보와 필터링 결과 로드`);
        const result = await fetchCompleteResults(
          matchingSearch.id,
          1,
          20,
          sortBy,
          onlyAvailable,
          [] // 카테고리 필터는 초기화 (빈 배열 사용)
        );
        
        if (result && result.items) {
          console.log(`[디버그] 검색 ID에서 ${result.items.length}개 결과 로드 성공 - 카테고리 필터 정보 포함`);
          
          // 직접 가져온 결과와 비교해서 더 많은 쪽 사용
          if (result.items.length >= existingResults.length) {
            setSearchResults(result.items);
            searchResultsRef.current = result.items;
          }
          
          // 페이징 정보 업데이트
          if (result.pagination) {
            setHasNextPage(result.pagination.has_next);
            setPagination(result.pagination);
            console.log(`[디버그] 페이지네이션 정보 업데이트: 총 ${result.pagination.total_items}개 항목`);
          }
        }
      } else {
        console.log(`[디버그] 검색 ID를 찾을 수 없음 - 필터링 불가능`);
      }
    } catch (error: any) {
      console.error('[디버그] 기존 결과 표시 중 오류:', error);
      setSearchError(`검색 중 오류가 발생했습니다: ${error.message || ''}`);
    } finally {
      setLoading(false);
    }
  };

  // 보이는 태그 수 계산 함수
  const calculateVisibleTags = useCallback(() => {
    if (!tagsContainerRef.current || recentSearches.length === 0) return;
    
    // 이미 펼쳐져 있으면 계산 중단
    if (showAllRecentSearches) return;
    
    const container = tagsContainerRef.current;
    const containerWidth = container.clientWidth;
    const currentWindowWidth = window.innerWidth;
    
    // 레이블 요소 찾기
    const label = container.querySelector('.recent-search-label');
    let availableWidth = containerWidth;
    
    // 레이블이 차지하는 공간 제외
    if (label) {
      const labelRect = label.getBoundingClientRect();
      availableWidth -= labelRect.width + 8; // 마진 고려
    }
    
    // 최근 검색어 태그 요소 가져오기 (recent-keyword 클래스 사용)
    const tagElements = container.querySelectorAll('.tag.recent-keyword');
    if (tagElements.length === 0) return;
    
    // 태그 크기 측정을 위한 변수들
    let tagWidths: number[] = [];
    let tagHeights: number[] = [];
    
    // 모든 태그의 실제 너비와 높이 측정
    tagElements.forEach((tag) => {
      const tagRect = tag.getBoundingClientRect();
      tagWidths.push(tagRect.width + 8); // 마진 고려
      tagHeights.push(tagRect.height);
    });
    
    // 540px 기준으로 최대 줄 수 결정
    const maxLines = currentWindowWidth > 540 ? 2 : 1;
    
    // 더보기 버튼의 정확한 너비 계산
    let moreButtonWidth = 0;
    
    // 더보기 버튼이 이미 존재하는 경우 실제 크기 측정
    const existingMoreButton = container.querySelector('.show-more-tag');
    if (existingMoreButton) {
      const moreButtonRect = existingMoreButton.getBoundingClientRect();
      moreButtonWidth = moreButtonRect.width + 8; // 마진 고려
    } else {
      // 더보기 버튼이 없는 경우, 숨겨진 태그 수에 따라 동적으로 크기 계산
      const hiddenCount = recentSearches.length - tagElements.length;
      if (hiddenCount < 10) {
        moreButtonWidth = 90; // "더보기 (X)"
      } else if (hiddenCount < 100) {
        moreButtonWidth = 100; // "더보기 (XX)"
      } else {
        moreButtonWidth = 110; // "더보기 (XXX)"
      }
      
      // 모바일에서는 버튼 크기를 약간 더 키움
      if (currentWindowWidth <= 540) {
        moreButtonWidth += 10;
      }
    }
    
    // 태그 배치 시뮬레이션
    let currentLineWidth = 0;
    let currentLine = 1;
    let visibleCount = 0;
    
    for (let i = 0; i < tagWidths.length; i++) {
      const tagWidth = tagWidths[i];
      
      // 다음 태그가 현재 줄에 들어갈 수 있는지 확인
      if (currentLineWidth + tagWidth > availableWidth) {
        // 다음 줄로 넘어감
        currentLine++;
        currentLineWidth = tagWidth;
        
        // 최대 줄 수를 초과하는지 확인
        if (currentLine > maxLines) {
          // 마지막 줄에서 더보기 버튼을 위한 공간 확보
          if (i > 0) visibleCount = i; // 현재 태그는 제외
          break;
        }
      } else {
        // 현재 줄에 추가
        currentLineWidth += tagWidth;
      }
      
      // 마지막 줄이고 다음 태그가 있는 경우 더보기 버튼 공간 확인
      if (currentLine === maxLines && i < tagWidths.length - 1) {
        // 남은 공간 계산
        const remainingWidth = availableWidth - currentLineWidth;
        
        // 다음 태그와 더보기 버튼을 위한 공간이 부족한 경우
        if (remainingWidth < Math.min(tagWidths[i+1] + moreButtonWidth, moreButtonWidth)) {
          // 더보기 버튼을 위한 공간 확보
          if (remainingWidth < moreButtonWidth) {
            visibleCount = i + 1;
            break;
          }
        }
      }
      
      visibleCount = i + 1;
    }
    
    // 숨겨진 태그가 2개 이상인지 확인
    const hiddenCount = tagWidths.length - visibleCount;
    
    // 더보기 버튼이 필요한지 확인 (숨겨진 태그가 2개 이상인 경우에만)
    const needMoreButton = hiddenCount >= 2;
    
    // 더보기 버튼이 필요한 경우 마지막 줄에 버튼을 위한 공간 확보
    if (needMoreButton) {
      // 마지막 줄에 더보기 버튼을 위한 공간 확인
      let remainingWidth = availableWidth - currentLineWidth;
      
      // 더보기 버튼을 위한 공간이 충분하지 않으면 마지막 태그 제거
      // 마지막 줄의 마지막 태그가 너무 크면 제거하여 더보기 버튼 공간 확보
      while (remainingWidth < moreButtonWidth && visibleCount > 1) {
        visibleCount--;
        
        // 현재 표시되는 마지막 태그의 너비를 찾기 위한 변수들
        let lastTagIndex = -1;
        let lastTagLineWidth = 0;
        
        // 현재 표시되는 마지막 태그가 어떤 줄에 있는지 확인
        let simLineCount = 1;
        let simLineWidth = 0;
        
        for (let i = 0; i < visibleCount; i++) {
          if (simLineWidth + tagWidths[i] > availableWidth) {
            // 다음 줄로 넘어감
            simLineCount++;
            simLineWidth = tagWidths[i];
          } else {
            // 현재 줄에 추가
            simLineWidth += tagWidths[i];
          }
          
          // 마지막 태그 위치 업데이트
          if (i === visibleCount - 1) {
            lastTagIndex = i;
            lastTagLineWidth = simLineWidth;
          }
        }
        
        // 마지막 줄의 너비 다시 계산
        currentLineWidth = lastTagLineWidth - tagWidths[lastTagIndex];
        remainingWidth = availableWidth - currentLineWidth;
      }
    } else if (visibleCount < tagWidths.length && visibleCount == tagWidths.length - 1) {
      // 숨겨진 태그가 1개인 경우, 해당 태그를 표시하고 더보기 버튼 표시하지 않음
      visibleCount = tagWidths.length;
    }
    
    // 최소 하나의 태그는 표시
    visibleCount = Math.max(1, visibleCount);
    
    // 디버그 정보 업데이트
    setDebugInfo({
      containerWidth,
      tagWidths,
      tagHeights,
      visibleCount,
      needMoreButton,
      isBrowserWider: currentWindowWidth > 540,
      moreButtonWidth,
      windowWidth: currentWindowWidth
    });
    
    setVisibleTagsCount(visibleCount);
  }, [recentSearches.length, showAllRecentSearches]);

  useEffect(() => {
    console.log('Home 컴포넌트가 마운트되었습니다.');
    
    // 화면 크기 변경 감지
    const handleResize = () => {
      const newWidth = window.innerWidth;
      setScreenWidth(newWidth);
      // 화면 크기 변경 시 태그 계산 즉시 실행
      if (!showAllRecentSearches) {
        calculateVisibleTags();
      }
    };
    
    // 초기 화면 크기 설정
    handleResize();
    
    // 화면 크기 변경 감지
    window.addEventListener('resize', handleResize);
    
    // 자체 인증 시스템으로 현재 사용자 정보 가져오기
    const getUser = async () => {
      if (isAuthenticated()) {
        const result = await getCurrentUser();
        if (result.success) {
          setUser(result.data);
          
          // 관리자 권한 확인
          const adminResult = await checkAdminStatus();
          setIsAdmin(adminResult.success && adminResult.data.is_admin);
        }
      }
    };

    getUser();
    fetchRecentSearches();

    // 컴포넌트 언마운트 시 폴링 정리
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      
      // resize 이벤트 리스너 제거
      window.removeEventListener('resize', handleResize);
    };
  }, [calculateVisibleTags, showAllRecentSearches]);
  
  // 주기적으로 최근 검색 이력 업데이트
  useEffect(() => {
    // 5초마다 최근 검색 이력 업데이트
    const intervalId = setInterval(() => {
      fetchRecentSearches();
    }, 5000);
    
    // 컴포넌트 언마운트 시 인터벌 정리
    return () => {
      clearInterval(intervalId);
    };
  }, []);
  
  // 최근 검색어 목록이 변경될 때만 펼치기 상태 초기화
  useEffect(() => {
    // 펼쳐진 상태 초기화
    setShowAllRecentSearches(false);
    // 콘텐츠가 실제로 렌더링된 후 계산 수행
    setTimeout(() => {
      calculateVisibleTags();
    }, 100);
  }, [recentSearches.length]); // calculateVisibleTags를 의존성에서 제거
  
  // 화면 크기가 변경되면 태그 계산 다시 실행 (펼쳐진 상태 유지)
  useEffect(() => {
    // 펼쳐진 상태가 아닐 때만 계산
    if (!showAllRecentSearches) {
      calculateVisibleTags();
    }
  }, [screenWidth, calculateVisibleTags, showAllRecentSearches]);

  // 검색 상태 폴링 설정 (검색 ID가 변경될 때마다)
  useEffect(() => {
    // 이전 인터벌 정리
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
      console.log('[디버그] 이전 폴링 인터벌 정리됨');
    }

    // 새 검색 ID가 있으면 폴링 시작
    if (currentSearchId) {
      console.log(`[디버그] 검색 ID ${currentSearchId}에 대한 상태 폴링 시작`);
      
      // 첫 번째 상태 확인 즉시 실행
      console.log('[디버그] 첫 상태 확인 즉시 실행');
      fetchSearchStatus(currentSearchId);
      
      const interval = window.setInterval(() => {
        console.log('[디버그] 주기적 폴링 실행');
        fetchSearchStatus(currentSearchId);
      }, 2000); // 2초마다 상태 체크
      
      setPollingInterval(interval);
    } else {
      console.log('[디버그] 검색 ID가 없어 폴링 시작하지 않음');
    }
    
    // 컴포넌트 언마운트 시 정리
    return () => {
      if (pollingInterval) {
        console.log('[디버그] 컴포넌트 언마운트로 폴링 정리');
        clearInterval(pollingInterval);
      }
    };
  }, [currentSearchId]);

  // 검색 상태가 완료되면 폴링 중지
  useEffect(() => {
    if (searchStatus && searchStatus.is_completed && pollingInterval) {
      console.log('[디버그] 검색이 완료되었습니다. 폴링을 중지합니다.');
      clearInterval(pollingInterval);
      setPollingInterval(null);
      
      // 검색이 완료되면 현재 필터 설정으로 결과를 다시 로드
      if (currentSearchId) {
        console.log('[디버그] 검색 완료 후 현재 필터 설정으로 결과 다시 로드 예정');
        // 상태 업데이트가 적용된 후 호출되도록 setTimeout 사용
        // 카테고리 필터 상태와 충돌 방지를 위해 약간 지연
        const reloadTimeout = setTimeout(() => {
          console.log('[디버그] 검색 완료 후 현재 필터 설정으로 결과 다시 로드 시작');
          // 직접 값을 전달하는 핸들러 사용
          handleOnlyAvailableWithValue(onlyAvailable, sortBy);
        }, 300);
        
        return () => {
          clearTimeout(reloadTimeout);
        };
      }
    }
  }, [searchStatus, pollingInterval, currentSearchId]);

  // 업데이트된 항목의 플래시 효과를 관리하는 효과
  useEffect(() => {
    if (updatedItems.length > 0) {
      // 3초 후에 업데이트된 항목 목록 초기화
      const timer = setTimeout(() => {
        setUpdatedItems([]);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [updatedItems]);

  // 검색 상태 조회 함수
  const fetchSearchStatus = async (searchId: string) => {
    try {
      // 백엔드 API 서버 URL
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      
      // 요청 설정
      const config: any = {
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      // 인증된 사용자인 경우 토큰 추가
      if (isAuthenticated()) {
        const token = localStorage.getItem('token');
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // 검색 상태 조회 요청
      const statusUrl = `${apiUrl}/api/search/status/${searchId}`;
      console.log(`[디버그] 검색 상태 조회 요청: ${statusUrl}`);
      
      const response = await axios.get(statusUrl, config);
      
      if (response.data) {
        console.log('[디버그] 검색 상태 응답:', JSON.stringify(response.data));
        setSearchStatus(response.data);
        console.log(`[디버그] 검색 진행률: ${response.data.completion_percentage}%, 완료: ${response.data.is_completed}, 총 프로세스: ${response.data.total_processes}`);
      }
    } catch (error: any) {
      console.error('검색 상태 조회 중 오류 발생:', error);
    }
  };

  // 최근 검색 이력 가져오기
  const fetchRecentSearches = async (): Promise<RecentSearch[]> => {
    setLoadingRecent(true);
    try {
      // 로그인 상태 확인 (자체 인증 시스템 사용)
      const authenticated = isAuthenticated();
      
      // 요청 설정
      const config: any = {
        headers: {
          'Content-Type': 'application/json'
        },
        params: {
          limit: 40 // 최대 40개 검색어 요청
        }
      };
      
      // 로그인된 경우에만 Authorization 헤더 추가
      if (authenticated) {
        const token = localStorage.getItem('token');
        config.headers.Authorization = `Bearer ${token}`;
        console.log('최근 검색 이력: 인증 토큰으로 요청합니다');
      } else {
        console.log('최근 검색 이력: 인증되지 않은 사용자라 요청하지 않습니다');
        setRecentSearches([]);
        setLoadingRecent(false);
        return []; // 인증되지 않은 경우 요청하지 않음
      }
      
      // 백엔드 API 서버 URL
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      
      // 백엔드 API를 통해 최근 검색 이력 요청
      const recentSearchUrl = `${apiUrl}/api/search/recent`;
      console.log(`최근 검색 이력 요청: ${recentSearchUrl}`);
      
      const response = await axios.get(recentSearchUrl, config);
      console.log('최근 검색 이력 응답 상태:', response.status);
      console.log('최근 검색 이력 응답:', response.data);
      
      if (response.data && Array.isArray(response.data)) {
        setRecentSearches(response.data);
        console.log('최근 검색 이력:', response.data);
        return response.data;
      } else {
        console.error('최근 검색 이력 응답이 배열이 아닙니다:', response.data);
        setRecentSearches([]);
        return [];
      }
    } catch (error: any) {
      console.error('최근 검색 이력 조회 중 오류 발생:', error);
      
      if (error.response) {
        // 서버 응답이 있는 경우 (에러 상태 코드)
        console.error('서버 응답 상태:', error.response.status);
        console.error('서버 응답 데이터:', error.response.data);
      } else if (error.request) {
        // 요청은 보냈지만 응답이 없는 경우
        console.error('응답을 받지 못했습니다:', error.request);
      } else {
        // 요청 설정 중 오류가 발생한 경우
        console.error('요청 설정 오류:', error.message);
      }
      
      setRecentSearches([]);
      return [];
    } finally {
      setLoadingRecent(false);
    }
  };

  // 기존 검색 결과 가져오기
  const fetchExistingResults = async (query: string): Promise<SearchResultItem[]> => {
    try {
      // 백엔드 API 서버 URL
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      
      // 검색 URL 생성 (기존 결과 요청)
      const url = `${apiUrl}/api/search/existing?query=${encodeURIComponent(query.trim())}`;
      
      console.log('[디버그] 기존 검색 결과 요청 URL:', url);
      
      // 인증 설정
      const token = localStorage.getItem('token');
      const authenticated = isAuthenticated();
      console.log('[디버그] 인증 상태:', authenticated ? '로그인됨' : '비로그인');
      
      // API 요청 전송
      const startTime = Date.now();
      console.log('[디버그] API 요청 시작 시간:', new Date(startTime).toISOString());
      
      const response = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(authenticated && token && { 'Authorization': `Bearer ${token}` })
        },
        timeout: 10000 // 10초 타임아웃 설정
      });
      
      const endTime = Date.now();
      console.log(`[디버그] API 응답 시간: ${endTime - startTime}ms`);
      
      // 응답 검증
      if (!response.data) {
        console.error('[디버그] API 응답이 없음:', response);
        return [];
      }
      
      if (!Array.isArray(response.data)) {
        console.error('[디버그] API 응답이 배열이 아님:', response.data);
        return [];
      }
      
      // 유효한 응답 처리
      console.log(`[디버그] 기존 검색 결과 로드 성공: ${response.data.length}개 항목`);
      if (response.data.length > 0) {
        console.log('[디버그] 첫 번째 항목 샘플:', response.data[0]);
      }
      
      return response.data;
    } catch (error: any) {
      console.error('[디버그] 기존 검색 결과 조회 중 오류 발생:', error);
      
      // 상세 오류 정보 로깅
      if (error.response) {
        // 서버가 응답을 반환한 경우
        console.error('[디버그] 응답 상태:', error.response.status);
        console.error('[디버그] 응답 데이터:', error.response.data);
        console.error('[디버그] 응답 헤더:', error.response.headers);
      } else if (error.request) {
        // 요청이 전송되었으나 응답이 없는 경우
        console.error('[디버그] 요청은 전송되었으나 응답 없음:', error.request);
      } else {
        // 요청 설정 중 오류가 발생한 경우
        console.error('[디버그] 요청 설정 오류:', error.message);
      }
      
      // 타임아웃 및 네트워크 오류에 대한 특별 처리
      if (error.code === 'ECONNABORTED') {
        console.error('[디버그] 요청 타임아웃 발생');
      }
      
      if (error.message && error.message.includes('Network Error')) {
        console.error('[디버그] 네트워크 오류 발생 - 서버에 연결할 수 없음');
      }
      
      return [];
    }
  };

  // 완료된 검색 결과 가져오기 (완전히 새로 작성)
  const fetchCompleteResults = async (
    searchId: string, 
    page: number = 1, 
    pageSize: number = 20, 
    sortBy: string = "created_at_desc", 
    onlyAvailable: boolean = false, 
    categoryIds: number[] = []
  ): Promise<{
    items: any[];
    pagination: any;
    category_total_items?: Record<string, number>;
  }> => {
    try {
      // 백엔드 API 서버 URL
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      
      // 검색 URL 생성
      let url = `${apiUrl}/api/search/results/${searchId}?page=${page}&page_size=${pageSize}&sort_by=${sortBy}&only_available=${onlyAvailable}`;
      
      // 카테고리 ID 추가
      if (categoryIds.length > 0) {
        categoryIds.forEach(id => {
          url += `&category_id=${id}`;
        });
      }
      
      console.log(`[디버그] API 요청 URL: ${url}`);
      
      // API 요청 전송
      const response = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(isAuthenticated() && { 'Authorization': `Bearer ${localStorage.getItem('token')}` })
        }
      });
      
      // 응답 검증
      if (!response.data || !response.data.results || !response.data.pagination) {
        console.error('[디버그] 유효하지 않은 API 응답:', response.data);
        setLoading(false);
        setIsLoadingSkeleton(false);
        setSearchResults([]);
        setPagination(null);
        setHasNextPage(false);
        return {
          items: [],
          pagination: { current_page: page, total_pages: 0, page_size: pageSize, total_items: 0, has_next: false, has_prev: false }
        };
      }
      
      // 유효한 응답 처리
      const { results, pagination, category_total_items } = response.data;
      
      console.log(`[디버그] API 응답 성공: ${results.length}개 항목 (총 ${pagination.total_items}개 중)`);
      console.log(`[디버그] 페이지 정보:`, pagination);
      
      // 카테고리별 아이템 개수 처리 (첫 페이지에서만, 항상 업데이트)
      if (page === 1 && category_total_items) {
        console.log('[디버그] 카테고리별 아이템 개수 로드:', Object.keys(category_total_items).length + '개 카테고리');
        // 중요: 카테고리 카운트 정보 상태 업데이트 - 필터 작동의 핵심
        setCategoryCount(category_total_items);
      }
      
      // 애니메이션 효과를 위한 지연 처리
      setTimeout(() => {
        // 상태 업데이트 (페이지 1일 경우 교체, 그 외에는 추가)
        if (page === 1) {
          // 첫 페이지는 기존 결과 대체
          setSearchResults(results);
          searchResultsRef.current = [...results];
          console.log(`[디버그] 검색 결과 상태 교체: ${results.length}개 항목`);
        } else {
          // 추가 페이지는 기존 결과에 추가 (중복 제거)
          setSearchResults(prevResults => {
            const newResults = [...prevResults, ...results];
            // 중복 제거 (link 기준)
            const uniqueResults = deduplicateItems(newResults);
            searchResultsRef.current = uniqueResults;
            console.log(`[디버그] 검색 결과 상태 추가: 기존 ${prevResults.length}개 + 신규 ${results.length}개 = 중복제거 후 ${uniqueResults.length}개`);
            return uniqueResults;
          });
        }
        
        // 페이지네이션 정보 업데이트
        setPagination({
          current_page: pagination.current_page,
          total_pages: pagination.total_pages,
          page_size: pagination.page_size,
          total_items: pagination.total_items,
          has_next: pagination.has_next,
          has_prev: pagination.has_prev
        });
        
        // 다음 페이지 존재 여부 설정
        setHasNextPage(pagination.has_next);
        
        // 로딩 상태 해제
        setLoading(false);
        setIsLoadingSkeleton(false);
      }, 300); // 300ms 지연으로 부드러운 전환 효과
      
      return {
        items: results,
        pagination: pagination,
        category_total_items: category_total_items  // 카테고리 정보도 함께 반환
      };
    } catch (error) {
      console.error('[디버그] 검색 결과 로드 중 오류 발생:', error);
      // 오류 발생 시 상태 초기화
      setLoading(false);
      setIsLoadingSkeleton(false);
      
      return {
        items: [],
        pagination: { current_page: page, total_pages: 0, page_size: pageSize, total_items: 0, has_next: false, has_prev: false }
      };
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchTerm.trim()) return;
    
    // 검색 모드를 'new'로 설정 (새 검색 요청임을 표시)
    setSearchMode('new');
    
    // URL에서 use_existing 파라미터 제거
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('q', searchTerm.trim());
    currentUrl.searchParams.delete('use_existing');
    window.history.pushState({}, '', currentUrl.toString());
    
    console.log(`[디버그] handleSearch 시작: 검색어 = ${searchTerm.trim()}`);
    
    setLoading(true);
    setIsSearched(true);
    setSearchError(null);
    setCurrentSearchId(null);
    setSearchStatus(null);
    setUpdatedItems([]);
    setLatestSearchTime(null);
    
    // 카테고리 필터 초기화 - 새 검색 시 항상 초기화
    setSelectedCategory([]);
    
    // 필터 및 페이징 초기화
    setCurrentPage(1);
    setHasNextPage(false);
    setPagination(null);
    
    try {
      // 백엔드 API 서버 URL
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      console.log('[디버그] 검색 API 서버 URL:', apiUrl);
      
      // 1. 먼저 기존 DB에서 검색 결과를 가져옵니다
      const existingResults = await fetchExistingResults(searchTerm);
      
      // 기존 결과를 바로 표시하고 참조에 저장합니다
      if (existingResults.length > 0) {
        console.log(`[디버그] 기존 결과 ${existingResults.length}개 항목 발견`);
        setSearchResults(existingResults);
        searchResultsRef.current = existingResults;
      } else {
        // 기존 결과가 없으면 결과 배열 초기화
        console.log(`[디버그] 기존 결과가 없음`);
        setSearchResults([]);
        searchResultsRef.current = [];
      }
      
      // 새 검색 요청을 보냅니다 (항상 새 검색 요청 생성)
      const searchData = {
        query: searchTerm.trim()
      };
      
      // 검색 요청 URL
      const searchUrl = `${apiUrl}/api/search/`;
      console.log(`[디버그] 검색 요청: ${searchUrl}`);
      console.log('[디버그] 검색 데이터:', searchData);
      
      // 인증 설정
      const token = localStorage.getItem('token');
      const authenticated = isAuthenticated();
      
      const config: any = {
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      if (authenticated && token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('[디버그] 인증 토큰으로 검색 요청합니다');
      } else {
        console.log('[디버그] 인증되지 않은 사용자로 검색 요청합니다.');
      }
      
      // 새 검색 요청 전송
      const response = await axios.post(searchUrl, searchData, config);
      
      console.log('검색 응답 상태:', response.status);
      
      // 응답 데이터 처리
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        console.log(`첫 검색 결과 ${response.data.length}개 항목 받음`);
        
        // 이 시점에서 초기 결과가 없는 경우 응답 결과 설정
        if (searchResultsRef.current.length === 0) {
          setSearchResults(response.data);
          searchResultsRef.current = response.data;
        }
      } else {
        // 응답에 데이터가 없고 기존 결과도 없는 경우 로딩 해제
        if (searchResultsRef.current.length === 0) {
          console.log(`[디버그] 응답과 기존 결과 모두 없음`);
          setLoading(false);
        }
      }
      
      // 응답 헤더에서 검색 ID 확인
      let searchId = null;
      
      // 1. 헤더에서 검색 ID 찾기 (기존 방식)
      if (response.headers && response.headers['x-search-id']) {
        searchId = response.headers['x-search-id'];
        console.log(`[디버그] 헤더에서 검색 ID를 받았습니다: ${searchId}`);
      } 
      // 2. 헤더에 없는 경우 다른 케이스 확인 (대소문자 구분 없이)
      else if (response.headers) {
        // 대소문자 구분 없이 헤더 확인
        const headerKeys = Object.keys(response.headers);
        for (const key of headerKeys) {
          if (key.toLowerCase() === 'x-search-id') {
            searchId = response.headers[key];
            console.log(`[디버그] 다른 형식의 헤더에서 검색 ID를 찾았습니다: ${searchId} (${key})`);
            break;
          }
        }
      }
      
      // 3. 응답 본문에서 검색 ID 찾기 시도 (백엔드 응답 구조에 따라 수정 필요)
      if (!searchId && response.data && response.data.length > 0 && response.data[0].search_id) {
        searchId = response.data[0].search_id;
        console.log(`[디버그] 응답 본문에서 검색 ID를 찾았습니다: ${searchId}`);
      }
      
      // 4. 최근 검색 이력에서 검색 ID 찾기 시도
      if (!searchId) {
        try {
          console.log(`[디버그] 최근 검색 이력에서 ID 찾기 시도`);
          const recentSearches = await fetchRecentSearches();
          const matchingSearch = recentSearches.find((s: RecentSearch) => 
            s.query.toLowerCase().trim() === searchTerm.toLowerCase().trim()
          );
          
          if (matchingSearch && matchingSearch.id) {
            searchId = matchingSearch.id;
            console.log(`[디버그] 최근 검색 이력에서 검색 ID를 찾았습니다: ${searchId}`);
          }
        } catch (err) {
          console.error('[디버그] 최근 검색 이력에서 ID 찾기 실패:', err);
        }
      }
      
      if (searchId) {
        console.log(`[디버그] 검색 ID 설정: ${searchId}`);
        
        // 중요: 검색 ID를 상태에 업데이트 (필터 작동을 위해 필수)
        setCurrentSearchId(searchId);
        console.log(`[디버그] 검색 ID 상태 업데이트됨, 이제 폴링이 시작될 예정`);
        
        // 즉시 첫 번째 결과 가져오기 (정렬 및 필터 적용)
        console.log(`[디버그] 검색 ID로 전체 결과 로드 시작 (카테고리 정보 포함)`);
        const result = await fetchCompleteResults(
          searchId,
          1, // 페이지 1
          20, // 페이지 크기 20
          sortBy, // 현재 선택된 정렬 방식
          onlyAvailable, // 거래 가능 필터 적용
          [] // 카테고리 필터는 초기화 (빈 배열 사용)
        );
        
        // 페이징 정보 업데이트
        if (result && result.pagination) {
          console.log(`[디버그] 페이지네이션 정보 받음: 총 ${result.pagination.total_items}개 항목`);
          setHasNextPage(result.pagination.has_next);
          setPagination(result.pagination);
          
          // 카테고리 정보 확인 로그 (상세 객체 로깅 없이 일반 메시지)
          console.log('[디버그] 카테고리별 항목 카운트 정보도 함께 로드됨');
          
          // 카테고리 카운트 정보 상태 업데이트 - 필터 작동의 핵심
          console.log('[디버그] 카테고리 정보 업데이트 시도');
          
          if (result.category_total_items) {
            console.log('[디버그] 카테고리별 아이템 개수 로드:', Object.keys(result.category_total_items).length + '개 카테고리');
            console.log('[디버그] 카테고리 카운트 데이터:', JSON.stringify(result.category_total_items));
            
            // 카테고리 카운트 정보 명시적 업데이트
            setCategoryCount(result.category_total_items);
            console.log('[디버그] 카테고리 카운트 정보 업데이트 완료');
          } else {
            console.log('[디버그] 카테고리 정보가 없음!', '필터링이 작동하지 않을 수 있음');
            setCategoryCount({}); // 빈 객체로 초기화
          }
        } else {
          console.log(`[디버그] 페이지네이션 정보가 없음`);
          setCategoryCount({}); // 페이지네이션 정보가 없는 경우에도 빈 카테고리 정보 설정
        }
        
        // 로딩 완료
        console.log(`[디버그] 검색 완료, 로딩 해제`);
        setLoading(false);
      } else {
        // 검색 ID가 없는 경우 처리
        console.error('[디버그] 응답에 검색 ID가 없습니다');
        
        // 오류 메시지 표시 대신 UI는 정상적으로 유지
        setLoading(false);
        
        // 검색 결과가 있으면 표시만 하고, 필터링은 비활성화
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          console.log(`[디버그] 검색 ID는 없지만 ${response.data.length}개 결과는 표시합니다. 필터링은 불가능합니다.`);
          
          // 기본적인 카테고리 카운트 정보라도 설정 (빈 객체)
          setCategoryCount({});
          
          // 페이징 정보 임의 설정 (최소한의 UI 기능 유지)
          setPagination({
            current_page: 1,
            total_pages: 1,
            page_size: 20,
            total_items: response.data.length,
            has_next: false,
            has_prev: false
          });
          
          // 데이터 로딩 상태 해제
          setLoading(false);
        }
      }
      
      // 최근 검색 이력 업데이트 (로그인된 경우만)
      if (authenticated) {
        setTimeout(() => {
          fetchRecentSearches();
        }, 500);
      }
    } catch (error: any) {
      console.error('[디버그] 검색 중 오류 발생:', error);
      handleSearchError(error);
      // 오류 발생 시 로딩 상태 해제
      setLoading(false);
    }
  };

  // 검색 오류 처리 헬퍼 함수
  const handleSearchError = (error: any) => {
    if (error.response) {
      console.error('서버 응답 상태:', error.response.status);
      console.error('서버 응답 데이터:', error.response.data);
      
      if (error.response.status === 401) {
        setSearchError('로그인이 필요한 기능입니다. 로그인 후 다시 시도해보세요.');
      } else {
        setSearchError(`서버 오류 (${error.response.status}): ${error.response.data.detail || error.response.data.message || '알 수 없는 오류'}`);
      }
    } else if (error.request) {
      console.error('응답을 받지 못했습니다:', error.request);
      setSearchError('서버에 연결할 수 없습니다. 네트워크 연결을 확인하세요.');
    } else {
      console.error('요청 설정 오류:', error.message);
      setSearchError(`오류 발생: ${error.message}`);
    }
  };

  // 최근 검색어로 검색하는 함수
  const searchWithRecent = async (query: string) => {
    if (!query.trim()) return;
    
    // 검색어 설정
    setSearchTerm(query);
    console.log(`최근 검색어로 검색: "${query}"`);
    
    // 검색 초기화
    setIsSearched(true);
    setSearchError(null);
    setCurrentSearchId(null);
    setSearchStatus(null);
    setUpdatedItems([]);
    setLatestSearchTime(null);
    setLoading(true);
    
    // 카테고리 필터 초기화 - 검색어 변경 시 항상 초기화
    setSelectedCategory([]);
    
    // 필터 및 페이징 초기화
    setCurrentPage(1);
    setHasNextPage(false);
    setPagination(null);
    
    try {
      console.log(`[디버그] '${query}' 검색 시작`);
      
      // 최근 검색 시간 정보 조회 (제일 먼저 조회하여 설정)
      console.log(`[디버그] 쿼리 '${query}'의 최근 검색 시간 조회 중`);
      const latestTime = await fetchLatestSearchTime(query);
      setLatestSearchTime(latestTime);
      console.log(`[디버그] 최근 검색 시간 조회 결과:`, latestTime);
      
      // 검색 모드를 'existing'으로 설정 (최신 검색 버튼 표시 위해)
      setSearchMode('existing');
      
      // 1. 최근 검색 이력에서 일치하는 검색어 찾기 (검색 ID를 얻기 위해)
      console.log(`[디버그] 사용자 검색 이력에서 검색 시도`);
      const recentSearches = await fetchRecentSearches();
      const matchingSearch = recentSearches.find((s: RecentSearch) => 
        s.query.toLowerCase().trim() === query.toLowerCase().trim()
      );
      
      // 2. 직접 API에서 기존 결과를 가져옵니다 (빠른 표시용)
      console.log(`[디버그] DB에서 직접 검색 결과 가져오기 (fetchExistingResults)`);
      const directResults = await fetchExistingResults(query);
      
      // URL에 use_existing=true 파라미터 추가
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('q', query);
      currentUrl.searchParams.set('use_existing', 'true');
      window.history.pushState({}, '', currentUrl.toString());
      
      // 검색 결과가 있는 경우 먼저 표시 (사용자 경험 개선)
      if (directResults && directResults.length > 0) {
        console.log(`[디버그] DB에서 직접 ${directResults.length}개 결과 찾음`);
        setSearchResults(directResults);
        searchResultsRef.current = directResults;
      } else {
        // 결과가 없는 경우
        console.log(`[디버그] DB에서 직접 결과를 찾지 못함`);
        setSearchResults([]);
        searchResultsRef.current = [];
      }
      
      // 매칭된 검색 ID가 있는 경우 - 카테고리 정보와 완전한 필터링을 위해 필수
      if (matchingSearch) {
        console.log(`[디버그] 검색어 "${query}"에 일치하는 최근 검색 ID 발견: ${matchingSearch.id}`);
        setCurrentSearchId(matchingSearch.id);
        
        // 검색 결과 로드 (정렬 및 필터 적용) - 카테고리 정보도 함께 로드됨
        console.log(`[디버그] 검색 ID로 카테고리 정보와 필터링 결과 로드: ${matchingSearch.id}`);
        const result = await fetchCompleteResults(
          matchingSearch.id,
          1,
          20,
          sortBy,
          onlyAvailable,
          [] // 카테고리 필터는 초기화 (빈 배열 사용)
        );
        
        if (result && result.items && result.items.length > 0) {
          console.log(`[디버그] 검색 ID에서 ${result.items.length}개 결과 로드 성공 - 카테고리 필터 정보 포함`);
          
          // 직접 가져온 결과와 비교해서 더 많은 쪽 사용
          if (result.items.length >= directResults.length) {
            setSearchResults(result.items);
            searchResultsRef.current = result.items;
          }
          
          // 페이징 정보 업데이트
          if (result.pagination) {
            setHasNextPage(result.pagination.has_next);
            setPagination(result.pagination);
            console.log(`[디버그] 페이지네이션 정보 업데이트: 총 ${result.pagination.total_items}개 항목`);
          }
        }
      } else {
        // 일치하는 검색 ID가 없는 경우 새 검색 시작
        console.log(`[디버그] 방법 3: 쿼리 '${query}'에 대한 일치하는 검색 ID가 없음, 새 검색 시작`);
        setSearchMode('new');
        
        // URL 변경 (use_existing 파라미터 제거)
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('q', query);
        currentUrl.searchParams.delete('use_existing');
        window.history.pushState({}, '', currentUrl.toString());
        
        // 폼 제출 이벤트 생성 및 트리거
        const formEvent = { preventDefault: () => {} } as React.FormEvent;
        handleSearch(formEvent);
      }
    } catch (error: any) {
      console.error('[디버그] 최근 검색어 검색 중 오류:', error);
      setSearchError(`검색 중 오류가 발생했습니다: ${error.message || ''}`);
    } finally {
      setLoading(false);
    }
  };

  // 시간 형식 변환 (예: x분전, x시간전, x일전, x달전)
  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return '알 수 없음';
    
    try {
      const now = new Date();
      const date = new Date(dateString);
      const diffMs = now.getTime() - date.getTime();
      
      // 분 단위
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 60) return `${diffMins}분 전`;
      
      // 시간 단위
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}시간 전`;
      
      // 일 단위
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 30) return `${diffDays}일 전`;
      
      // 월 단위
      const diffMonths = Math.floor(diffDays / 30);
      if (diffMonths < 12) {
        return `${diffMonths}개월 전`;
      }
      
      // 년 단위
      const diffYears = Math.floor(diffMonths / 12);
      return `${diffYears}년 전`;
    } catch (e) {
      console.error('날짜 변환 오류:', e);
      return '알 수 없음';
    }
  };
  
  // 끌올 여부 확인
  const isReposted = (createdAt: string, boostedAt: string) => {
    if (!createdAt || !boostedAt) return false;
    
    try {
      const createdDate = new Date(createdAt);
      const boostedDate = new Date(boostedAt);
      
      // 생성일과 부스트(끌올) 날짜가 다른 경우
      return boostedDate.getTime() > createdDate.getTime();
    } catch (e) {
      console.error('날짜 비교 오류:', e);
      return false;
    }
  };
  
  // 가격 포맷 함수 
  const formatPrice = (price: string | number | null | undefined) => {
    if (price === null || price === undefined || price === '') {
      return '나눔';
    }
    
    if (typeof price === 'number') {
      if (price === 0 || price === 0.0) {
        return '나눔';
      }
      return price.toLocaleString() + '원';
    }
    
    // 문자열 '0' 또는 '0.0'도 처리
    if (price === '0' || price === '0.0') {
      return '나눔';
    }
    
    return price;
  };
  
  // 상태 라벨 스타일 
  const getStatusLabel = (status: string) => {
    if (!status) return null;
    
    if (status === 'Closed') {
      return (
        <div className="status-label is-sold">
          거래완료
        </div>
      );
    } else if (status === 'Reserved') {
      return (
        <div className="status-label is-reserved">
          예약중
        </div>
      );
    }
    
    return null;
  };

  // 최근 검색 시간 조회 함수
  const fetchLatestSearchTime = async (query: string): Promise<LatestSearchTime | null> => {
    try {
      // 백엔드 API 서버 URL
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      
      // 요청 설정
      const config: any = {
        headers: {
          'Content-Type': 'application/json'
        },
        params: {
          query: query.trim()
        }
      };
      
      // 인증된 사용자인 경우 토큰 추가
      if (isAuthenticated()) {
        const token = localStorage.getItem('token');
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // 백엔드 API에 최근 검색 시간 요청
      const response = await axios.get(`${apiUrl}/api/search/latest-time`, config);
      
      if (response.data) {
        console.log(`쿼리 '${query}'의 최근 검색 시간 정보:`, response.data);
        return response.data;
      }
      
      return null;
    } catch (error: any) {
      console.error('최근 검색 시간 조회 중 오류 발생:', error);
      return null;
    }
  };

  // 무한 스크롤 설정 - 컴포넌트 마운트 시 인터섹션 옵저버 설정
  useEffect(() => {
    console.log('[디버그] 인피니티 스크롤 옵저버 설정됨');
    
    // 기존 옵저버 정리
    if (observerRef.current) {
      console.log('[디버그] 기존 옵저버 정리');
      observerRef.current.disconnect();
    }
    
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasNextPage && !isLoadingMore && currentSearchId) {
          console.log('[디버그] 관찰 요소가 화면에 나타남 - 추가 결과 로드');
          loadMoreResults();
        }
      },
      { 
        threshold: 0.01, // 1%만 보여도 로드 시작
        rootMargin: '300px 0px' // 화면 아래쪽 300px 전부터 감지 시작
      }
    );
    
    observerRef.current = observer;
    
    if (loadMoreRef.current) {
      console.log('[디버그] 로드 타겟 요소 관찰 시작');
      observer.observe(loadMoreRef.current);
    }
    
    return () => {
      if (observerRef.current) {
        console.log('[디버그] 인피니티 스크롤 옵저버 정리');
        observerRef.current.disconnect();
      }
    };
  }, [hasNextPage, isLoadingMore, currentSearchId, currentPage, sortBy, onlyAvailable, searchResults.length]);

  // 로드 타겟 설정
  useEffect(() => {
    if (loadMoreRef.current && observerRef.current) {
      console.log('[디버그] 로드 타겟 요소 변경 - 관찰 재설정');
      observerRef.current.observe(loadMoreRef.current);
    }
  }, [loadMoreRef.current, searchResults]);

  // 중복 항목 제거 유틸리티 함수 추가
  const deduplicateItems = (items: SearchResultItem[]): SearchResultItem[] => {
    console.log(`[디버그] 중복 제거 전 항목 수: ${items.length}`);
    
    // link를 기준으로 중복 제거
    const uniqueMap = new Map<string, SearchResultItem>();
    items.forEach(item => {
      uniqueMap.set(item.link, item);
    });
    
    const uniqueItems = Array.from(uniqueMap.values());
    console.log(`[디버그] 중복 제거 후 항목 수: ${uniqueItems.length}`);
    
    return uniqueItems;
  };

  // 추가 결과 로드 함수
  const loadMoreResults = async () => {
    if (!currentSearchId || isLoadingMore || !hasNextPage) {
      return;
    }
    
    setIsLoadingMore(true);
    
    try {
      const nextPage = currentPage + 1;
      console.log(`[디버그] 다음 페이지(${nextPage}) 로드 중... 정렬: ${sortBy}, 거래가능만: ${onlyAvailable}, 카테고리: ${selectedCategory.length ? selectedCategory.join(',') : '전체'}`);
      
      // 페이지 증가
      setCurrentPage(nextPage);
      
      // 수정된 fetchCompleteResults 함수를 호출하여 추가 결과 로드
      const result = await fetchCompleteResults(
        currentSearchId,
        nextPage,
        20,
        sortBy,
        onlyAvailable,
        selectedCategory // 사용자가 현재 선택한 카테고리 필터 사용
      );
      
      // 디버그 정보 로깅
      console.log(`[디버그] 페이지 ${nextPage} 로드 완료: API에서 ${result.items.length}개 항목 받음, 현재 표시된 총 항목: ${searchResults.length}개`);
      
      if (result.pagination.total_items !== (pagination?.total_items || 0)) {
        console.log(`[디버그] 주의: 페이지네이션 항목 수 변경됨 - 이전=${pagination?.total_items || 0}, 현재=${result.pagination.total_items}`);
      }
    } catch (error) {
      console.error('[디버그] 추가 결과 로드 중 오류 발생:', error);
      // 오류 발생 시 현재 페이지 복원
      setCurrentPage(prevPage => prevPage - 1);
    } finally {
      setIsLoadingMore(false);
    }
  };
  
  // 필터 관련 공통 초기화 함수 수정 - 검색 결과를 초기화하지 않도록 변경
  const resetFilterState = () => {
    console.log('[디버그] 필터 상태 초기화');
    
    // 인피니티 스크롤 상태 초기화
    setCurrentPage(1);
    setHasNextPage(false);
    setPagination(null);
    setIsLoadingMore(false);
    
    // 스켈레톤 UI 표시
    setIsLoadingSkeleton(true);
    
    // 관찰자 초기화 (필요한 경우)
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
  };
  
  // 필터 변경 시 결과 다시 로드
  const handleFilterChange = async () => {
    if (!currentSearchId) return;
    
    console.log(`[디버그] 필터 변경: 정렬=${sortBy}, 거래가능만=${onlyAvailable}, 카테고리=${selectedCategory.join(',') || '전체'}`);
    console.log(`[디버그] 현재 검색 ID: ${currentSearchId} (null이 아닌지 확인)`);
    console.log(`[디버그] 카테고리 카운트 정보 있는지 확인:`, Object.keys(categoryCount).length > 0 ? 'O' : 'X');
    
    // 로딩 상태는 true로 설정하되, 결과는 유지 (기존 결과는 스켈레톤이 아닌 계속 표시)
    setLoading(true);
    setIsLoadingSkeleton(true);
    
    // 필터 관련 상태 초기화 - 결과는 유지
    resetFilterState();
    
    try {
      // fetchCompleteResults는 이제 상태를 직접 업데이트하는 새로운 구현
      console.log(`[디버그] 필터 변경을 위한 API 호출`);
      const result = await fetchCompleteResults(
        currentSearchId,
        1,
        20,
        sortBy,
        onlyAvailable,
        selectedCategory // 현재 선택된 카테고리 필터 사용
      );
      
      // 디버그 정보 로깅
      console.log(`[디버그] 필터 변경 완료: ${searchResults.length}개 항목 (API 총 항목: ${result.pagination.total_items}개)`);
      console.log(`[디버그] 필터 변경 이후 카테고리 정보:`, result.category_total_items ? 'O' : 'X');
      
      // API 응답 페이지네이션 확인
      if (result.pagination.total_items !== (pagination?.total_items || 0)) {
        console.log(`[디버그] 페이지네이션 항목 수 변경됨: 이전=${pagination?.total_items || 0}, 현재=${result.pagination.total_items}`);
      }
    } catch (error) {
      console.error('[디버그] 필터 변경 후 결과 로드 중 오류 발생:', error);
    } finally {
      setLoading(false);
      setIsLoadingSkeleton(false);
    }
  };
  
  // 정렬 변경 핸들러
  const handleSortChange = (value: 'created_at_desc' | 'price_asc') => {
    console.log(`[디버그] 정렬 방식 변경: ${value}`);
    
    // 사용자가 현재 스크롤 중이면 모든 자동 스크롤 취소
    if (isUserScrolling) {
      cancelAllPendingScrolls();
    }
    
    setSortBy(value);
    // 상태 업데이트가 비동기적이므로 직접 값을 전달하는 방식으로 변경
    handleSortChangeWithValue(value, onlyAvailable);
    
    // 즉시 스크롤 - 애니메이션 없는 버전 사용
    scrollToSearchResultsTopInstantly();
  };
  
  // 직접 값을 전달하는 방식의 정렬 변경 핸들러
  const handleSortChangeWithValue = async (sortValue: 'created_at_desc' | 'price_asc', onlyAvail: boolean) => {
    if (!currentSearchId) return;
    
    console.log(`[디버그] 정렬 변경 실행 with value: 정렬=${sortValue}, 거래가능만=${onlyAvail}, 카테고리=${selectedCategory.join(',') || '전체'}`);
    setLoading(true);
    
    // 필터 관련 상태 초기화
    resetFilterState();
    
    try {
      const result = await fetchCompleteResults(
        currentSearchId,
        1,
        20,
        sortValue,
        onlyAvail,
        selectedCategory.length > 0 ? selectedCategory : []
      );
      
      console.log(`[디버그] 정렬 변경 완료: ${searchResults.length}개 항목 (API 총 항목: ${result.pagination.total_items}개)`);
    } catch (error) {
      console.error('[디버그] 정렬 변경 후 결과 로드 중 오류 발생:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // 거래 가능 필터 토글 핸들러
  const handleOnlyAvailableToggle = () => {
    console.log(`[디버그] 거래 가능만 보기 변경: ${!onlyAvailable}`);
    
    // 사용자가 현재 스크롤 중이면 모든 자동 스크롤 취소
    if (isUserScrolling) {
      cancelAllPendingScrolls();
    }
    
    const newValue = !onlyAvailable;
    setOnlyAvailable(newValue);
    // 상태 업데이트가 비동기적이므로 직접 값을 전달하는 방식으로 변경
    handleOnlyAvailableWithValue(newValue, sortBy);
    
    // 즉시 스크롤 - 애니메이션 없는 버전 사용
    scrollToSearchResultsTopInstantly();
  };
  
  // 직접 값을 전달하는 방식의 거래 가능 필터 핸들러
  const handleOnlyAvailableWithValue = async (onlyAvail: boolean, sortValue: 'created_at_desc' | 'price_asc') => {
    if (!currentSearchId) return;
    
    console.log(`[디버그] 거래 가능만 보기 실행 with value: 정렬=${sortValue}, 거래가능만=${onlyAvail}, 카테고리=${selectedCategory.join(',') || '전체'}`);
    setLoading(true);
    
    // 필터 관련 상태 초기화
    resetFilterState();
    
    try {
      const result = await fetchCompleteResults(
        currentSearchId,
        1,
        20,
        sortValue,
        onlyAvail,
        selectedCategory.length > 0 ? selectedCategory : []
      );
      
      console.log(`[디버그] 거래 가능만 변경 완료: ${searchResults.length}개 항목 (API 총 항목: ${result.pagination.total_items}개)`);
    } catch (error) {
      console.error('[디버그] 거래 가능 필터 변경 후 결과 로드 중 오류 발생:', error);
    } finally {
      setLoading(false);
    }
  };

  // 카테고리 선택 핸들러
  const handleCategorySelect = (categoryId: number | null) => {
    console.log(`[디버그] 카테고리 변경: ${categoryId}`);
    
    // 사용자가 현재 스크롤 중이면 모든 자동 스크롤 취소
    if (isUserScrolling) {
      cancelAllPendingScrolls();
    }
    
    if (categoryId === null) {
      // 전체 카테고리 선택 (필터 초기화)
      setSelectedCategory([]);
    } else {
      // 이미 선택된 카테고리라면 제거, 아니면 추가
      if (selectedCategory.includes(categoryId)) {
        setSelectedCategory(selectedCategory.filter((id) => id !== categoryId));
      } else {
        setSelectedCategory([...selectedCategory, categoryId]);
      }
    }
    
    // 카테고리 필터 드롭다운 닫기
    setShowCategoryFilter(false);
    
    // 카테고리 변경 즉시 스크롤 이동 (애니메이션 없는 즉시 이동)
    if (searchResultsMainRef.current) {
      // 현재 검색 결과 영역이 보이지 않는 경우 즉시 스크롤
      const searchResultsRect = searchResultsMainRef.current.getBoundingClientRect();
      if (searchResultsRect.top < 0) {
        // 즉시 이동 (애니메이션 없음)
        scrollToSearchResultsTopInstantly();
      }
    }
  };

  // selectedCategory가 변경될 때 필터 적용
  useEffect(() => {
    // 검색이 이미 실행된 상태에서만 필터 적용
    if (currentSearchId && isSearched) {
      console.log(`[디버그] 카테고리 상태 변경 감지: ${selectedCategory.join(',') || '전체'}`);
      
      // 현재 선택된 카테고리 이름들 로깅
      if (selectedCategory.length > 0) {
        const categoryNames = selectedCategory.map(id => 
          CATEGORIES.find(c => c.id === id)?.name || `알 수 없는 카테고리(${id})`
        );
        console.log(`[디버그] 선택된 카테고리: ${categoryNames.join(', ')}`);
      } else {
        console.log(`[디버그] 모든 카테고리 선택됨`);
      }
      
      // API 요청 URL 확인
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const categoryParams = selectedCategory.length > 0 
        ? selectedCategory.map(id => `&category_id=${id}`).join('') 
        : '';
      const debugUrl = `${apiUrl}/api/search/results/${currentSearchId}?page=1&page_size=20&sort_by=${sortBy}&only_available=${onlyAvailable}${categoryParams}`;
      console.log(`[디버그] 필터 적용 API URL: ${debugUrl}`);
      
      // 필터 변경 적용
      handleFilterChange();
      
      // 사용자 스크롤 여부를 확인하는 지연 스크롤 함수 사용
      scrollWithDelay(800);
    }
  }, [selectedCategory]);

  // 카테고리 필터 토글
  const toggleCategoryFilter = () => {
    setShowCategoryFilter(!showCategoryFilter);
  };

  // 썸네일 이미지 처리 함수 수정
  const getThumbnailImage = (item: SearchResultItem) => {
    // 썸네일이 있으면 그대로 사용
    if (item.thumbnail) {
      return item.thumbnail;
    } 
    
    // 썸네일이 없고 category_id가 있는 경우
    if (item.category_id) {
      const categoryMatch = CATEGORIES.find(cat => cat.id === item.category_id);
      if (categoryMatch) {
        return categoryMatch.image;
      }
    }
    
    // 썸네일이 없고 category_id는 없지만 category URL이 있는 경우
    if (item.category) {
      // 정확히 일치하는 카테고리가 있는지 확인
      const exactMatch = CATEGORIES.find(cat => 
        typeof cat.image === 'string' && cat.image.includes(item.category.split('/').pop() || '')
      );
      if (exactMatch) {
        return exactMatch.image;
      }
      
      // 클라우드 URL인 경우 파일명으로 매칭
      if (item.category.includes('cloudfront.net')) {
        const fileName = item.category.split('/').pop();
        // 파일명으로 이미지 가져오기
        switch (fileName) {
          case '2c0811ac0c0f491039082d246cd41de636d58cd6e54368a0b012c386645d7c66.png': return digitalImg;
          case 'ff36d0fb3a3214a9cc86c79a84262e0d9e11b6d7289ed9aa75e40d0129764fac.png': return applianceImg;
          case '088e41c5973184228a2e4a50961ceb6fc366bb3eb11b1ee7c7cd66bcdf9c5529.png': return furnitureImg;
          case '22a78937b8a8ccd0003ff7bb7c247b3863a5046f93a36b5341913ff2935efa43.png': return livingImg;
          case '1975d6ba1725dfbe053daa450cec51757a39943104d57fbdd3fc5c7d8ae07605.png': return kidsImg;
          case '987b21e9e02255cb310e4736b16e056d0bfc90c397e423e599b544bad203601e.png': return kidsBooksImg;
          case 'b99fb12bcc754a08e5a6f359861bafd80d38678a0c58521abdf314949f9c5e58.png': return womenClothingImg;
          case '23f6b89ba63da7cf8135e1063bde3811fb6499dc073585eea161b3727a42535e.png': return womenAccessoriesImg;
          case '38dd757c99863d1748f16292142cabfae9621622cc751faff49a79ed60c1c5e7.png': return menFashionImg;
          case '1efa73a4e3b45610292223f44c42cbe3c7d93395a23f1134426a58d5639c179b.png': return beautyImg;
          case '6379c3ba41f03dc6e27796c5f106c8b20b57d79ddb3ba52440084fcd4d10d8dd.png': return sportsImg;
          case '074da39b1114588ebc61447883f5f0059dd4abc16127f4250f559360f40eb0e2.png': return hobbyImg;
          case '0ce93f6b19d61169b955dae5422aa9f842933d8ccf35dc4c53cea8656a293e40.png': return booksImg;
          case '631cb98e2c7cf46f1f2520f97b0ec2d30ce426c4c158ea3673f84e0aca088181.png': return ticketsImg;
          case '243b21522a5ff57863942f0ed84a04b3cc72f30ca9edda818f31238fc94066ee.png': return foodImg;
          case 'c22153f3cca52c69efb2b4c15e8e644ea7118b2f8c07d378ec8b75489c31cf46.png': return healthFoodImg;
          case '763d2fb8809deb0a5ebd4ef2694ecb2d8b08f501ab185f7167d87a74a33aee10.png': return petImg;
          case '248610f466d99a9a7cafa1c75a818a73bf850e05c7f7c205cbc60c7b7b16f876.png': return plantImg;
          case '407b005b01de954b59aff9e21f729b3c30e3ae249acfb643401f235598dea8e3.png': return otherImg;
          case '6a729d83f311aa3e8ffa12c9757cfda323591a0018ce2d25da6bf604615e33c2.png': return buyImg;
          default: return otherImg;
        }
      }
    }
    
    // 기본 카테고리 이미지 (기타 중고물품)
    return otherImg;
  };

  // 필터 모달 열기/닫기
  const toggleFilterModal = () => {
    setIsFilterModalOpen(!isFilterModalOpen);
  };

  // 스크롤 이벤트 감지 설정 - 사용자 스크롤 즉시 감지 및 처리
  useEffect(() => {
    // 스크롤 이벤트 핸들러
    const handleScroll = () => {
      // 자동 스크롤 중이 아닐 때만 사용자 스크롤로 간주
      if (!isAutoScrollingRef.current) {
        // 사용자가 스크롤 중임을 표시
        setIsUserScrolling(true);
        
        // 자동 스크롤이 예정되어 있다면 모두 취소
        cancelAllPendingScrolls();
        
        // 기존 타이머 정리
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        
        // 스크롤이 멈추고 300ms 후에 사용자 스크롤 상태 해제
        scrollTimeoutRef.current = setTimeout(() => {
          setIsUserScrolling(false);
        }, 300);
      }
    };

    // wheel 이벤트 핸들러 (마우스 휠 스크롤)
    const handleWheel = () => {
      // 자동 스크롤 중이라도 사용자 wheel 동작은 즉시 자동 스크롤 취소
      if (isAutoScrollingRef.current) {
        cancelAutoScroll();
      }
      
      // 사용자 스크롤 상태 설정
      setIsUserScrolling(true);
      
      // 타이머 설정
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      scrollTimeoutRef.current = setTimeout(() => {
        setIsUserScrolling(false);
      }, 300);
    };

    // touchmove 이벤트 핸들러 (모바일 터치 스크롤)
    const handleTouchMove = () => {
      // 자동 스크롤 중이라도 사용자 터치 동작은 즉시 자동 스크롤 취소
      if (isAutoScrollingRef.current) {
        cancelAutoScroll();
      }
      
      // 사용자 스크롤 상태 설정
      setIsUserScrolling(true);
      
      // 타이머 설정
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      scrollTimeoutRef.current = setTimeout(() => {
        setIsUserScrolling(false);
      }, 300);
    };
    
    // 모든 종류의 스크롤 이벤트 감지를 위한 이벤트 리스너 등록
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: true, capture: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true, capture: true });
    
    // 클린업
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('wheel', handleWheel, { capture: true });
      window.removeEventListener('touchmove', handleTouchMove, { capture: true });
      
      cancelAllPendingScrolls();
    };
  }, []);

  // 모든 예정된 스크롤 취소
  const cancelAllPendingScrolls = () => {
    // 지연된 스크롤 타이머 취소
    if (delayedScrollRef.current) {
      clearTimeout(delayedScrollRef.current);
      delayedScrollRef.current = null;
    }
    
    // 자동 스크롤 애니메이션 취소
    cancelAutoScroll();
  };

  // 자동 스크롤 취소
  const cancelAutoScroll = () => {
    if (scrollAnimationFrameRef.current) {
      cancelAnimationFrame(scrollAnimationFrameRef.current);
      scrollAnimationFrameRef.current = null;
    }
    isAutoScrollingRef.current = false;
    console.log('[디버그] 자동 스크롤 취소됨');
  };

  // 검색 결과 영역의 시작점으로 즉시 스크롤 (애니메이션 없음)
  const scrollToSearchResultsTopInstantly = () => {
    if (searchResultsMainRef.current) {
      const searchResultsRect = searchResultsMainRef.current.getBoundingClientRect();
      
      // 검색 결과 영역의 상단이 화면 상단보다 위에 있을 경우에만 스크롤 조정
      if (searchResultsRect.top < 0) {
        console.log('[디버그] 검색 결과 상단으로 즉시 스크롤 이동');
        
        // 즉시 스크롤 - animation 없음
        window.scrollTo({
          top: window.scrollY + searchResultsRect.top - 20,
          behavior: 'auto'
        });
      }
    }
  };

  // 검색 결과 영역의 시작점으로 커스텀 스크롤 (requestAnimationFrame 사용)
  const scrollToSearchResultsTop = () => {
    // 사용자가 현재 스크롤 중이면 스크롤하지 않음
    if (isUserScrolling) {
      console.log('[디버그] 사용자가 스크롤 중이므로 자동 스크롤 취소');
      return;
    }
    
    // 기존에 실행 중인 자동 스크롤이 있으면 취소
    cancelAutoScroll();
    
    if (searchResultsMainRef.current) {
      const searchResultsRect = searchResultsMainRef.current.getBoundingClientRect();
      
      // 검색 결과 영역의 상단이 화면 상단보다 위에 있을 경우에만 스크롤 조정
      if (searchResultsRect.top < 0) {
        console.log('[디버그] 검색 결과 상단으로 커스텀 스크롤 시작');
        
        // 스크롤할 목표 위치 계산
        const startScrollY = window.scrollY;
        const targetScrollY = startScrollY + searchResultsRect.top - 20;
        const scrollDistance = targetScrollY - startScrollY;
        
        // 너무 짧은 거리는 즉시 스크롤
        if (Math.abs(scrollDistance) < 50) {
          window.scrollTo(0, targetScrollY);
          return;
        }
        
        // 스크롤 애니메이션 시작 시간
        const startTime = performance.now();
        const duration = 120; // 매우 짧은 애니메이션 시간 (120ms)
        
        // 자동 스크롤 플래그 설정
        isAutoScrollingRef.current = true;
        
        // 애니메이션 프레임 함수
        const animateScroll = (currentTime: number) => {
          const elapsedTime = currentTime - startTime;
          
          // 사용자가 스크롤을 시작했거나 시간이 초과되면 애니메이션 중단
          if (isUserScrolling || elapsedTime >= duration) {
            isAutoScrollingRef.current = false;
            scrollAnimationFrameRef.current = null;
            return;
          }
          
          // 진행률 계산 (0~1)
          const progress = Math.min(elapsedTime / duration, 1);
          
          // easeOutQuad 이징 함수로 부드러운 감속 효과
          const easeProgress = 1 - (1 - progress) * (1 - progress);
          
          // 새 스크롤 위치 계산 및 적용
          const newScrollY = startScrollY + scrollDistance * easeProgress;
          window.scrollTo(0, newScrollY);
          
          // 애니메이션 계속
          scrollAnimationFrameRef.current = requestAnimationFrame(animateScroll);
        };
        
        // 애니메이션 시작
        scrollAnimationFrameRef.current = requestAnimationFrame(animateScroll);
      }
    }
  };

  // 지연된 스크롤 함수 - 사용자 스크롤 상태를 확인하여 실행
  const scrollWithDelay = (delay: number) => {
    // 기존 지연 스크롤 타이머 취소
    if (delayedScrollRef.current) {
      clearTimeout(delayedScrollRef.current);
    }
    
    // 새 타이머 설정
    delayedScrollRef.current = setTimeout(() => {
      // 사용자가 스크롤 중이 아닐 때만 자동 스크롤 실행
      if (!isUserScrolling) {
        scrollToSearchResultsTop();
      } else {
        console.log('[디버그] 사용자 스크롤 감지: 자동 스크롤 취소');
      }
    }, delay);
  };

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (delayedScrollRef.current) {
        clearTimeout(delayedScrollRef.current);
      }
      if (scrollAnimationFrameRef.current) {
        cancelAnimationFrame(scrollAnimationFrameRef.current);
      }
    };
  }, []);

  // 스켈레톤 아이템 렌더링 함수 (갤러리 뷰)
  const renderSkeletonItems = () => {
    return Array(skeletonItemsCount).fill(0).map((_, index) => (
      <div key={`skeleton-${index}`} className="search-item-card skeleton-item">
        <div className="skeleton-image"></div>
        <div className="p-3">
          <div className="skeleton-title"></div>
          <div className="skeleton-description"></div>
          <div className="skeleton-description"></div>
          <div className="skeleton-price"></div>
          <div className="skeleton-meta"></div>
        </div>
      </div>
    ));
  };
  
  // 스켈레톤 아이템 렌더링 함수 (리스트 뷰)
  const renderListSkeletonItems = () => {
    return Array(skeletonItemsCount).fill(0).map((_, index) => (
      <div key={`list-skeleton-${index}`} className="search-item-list skeleton-item">
        <div className="skeleton-image" style={{ width: '80px', height: '60px' }}></div>
        <div className="search-item-list-content" style={{ padding: '8px 12px' }}>
          <div style={{ flex: 1 }}>
            <div className="skeleton-title" style={{ height: '16px', width: '80%', marginBottom: '8px' }}></div>
            <div className="skeleton-description" style={{ height: '12px', width: '90%' }}></div>
          </div>
          <div style={{ width: '100px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div className="skeleton-price" style={{ height: '16px', width: '80px', marginBottom: '6px' }}></div>
            <div className="skeleton-meta" style={{ height: '12px', width: '70px' }}></div>
          </div>
        </div>
      </div>
    ));
  };

  // 모든 필터 초기화 함수 추가
  const resetAllFilters = () => {
    // 거래 가능만 보기 체크 해제
    setOnlyAvailable(false);
    // 정렬 최신순으로 변경
    setSortBy('created_at_desc');
    // 선택된 카테고리 초기화
    setSelectedCategory([]);
    
    // 현재 검색 ID가 있는 경우 필터 적용
    if (currentSearchId) {
      // 필터 적용 상태 초기화
      resetFilterState();
      
      // 필터 변경 적용 (최신순, 거래가능 해제, 전체 카테고리)
      fetchCompleteResults(
        currentSearchId,
        1,
        20,
        'created_at_desc',
        false,
        []
      );
      
      // 결과 상단으로 스크롤
      scrollToSearchResultsTopInstantly();
    }
  };

  // 스타일 적용을 위한 useEffect 추가
  useEffect(() => {
    // 이미 스타일이 적용되어 있는지 확인
    if (!document.getElementById('home-custom-styles')) {
      const styleElement = document.createElement('style');
      styleElement.id = 'home-custom-styles';
      styleElement.innerHTML = styles;
      document.head.appendChild(styleElement);
    }
    
    // 컴포넌트 언마운트 시 스타일 제거
    return () => {
      const styleElement = document.getElementById('home-custom-styles');
      if (styleElement) {
        document.head.removeChild(styleElement);
      }
    };
  }, []);

  // 태그 컨테이너 크기 변경 감지를 위한 ResizeObserver 설정
  useEffect(() => {
    if (!tagsContainerRef.current) return;
    
    // ResizeObserver 생성
    const resizeObserver = new ResizeObserver(entries => {
      // 펼쳐진 상태가 아닐 때만 재계산
      if (!showAllRecentSearches) {
        calculateVisibleTags();
      }
    });
    
    // 컨테이너 요소 관찰 시작
    resizeObserver.observe(tagsContainerRef.current);
    
    // 컴포넌트 언마운트 시 관찰 중단
    return () => {
      resizeObserver.disconnect();
    };
  }, [calculateVisibleTags, showAllRecentSearches]);

  // URL에서 쿼리 파라미터를 가져오는 부분 예시
  useEffect(() => {
    // URL 파라미터 가져오기
    const params = new URLSearchParams(window.location.search);
    const queryParam = params.get('q');
    const useExistingParam = params.get('use_existing');
    
    if (queryParam) {
      console.log(`[디버그] URL에서 검색어 감지: ${queryParam}, 기존 결과 사용: ${useExistingParam === 'true'}`);
      
      // 검색어 설정
      setSearchTerm(queryParam);
      
      // 카테고리 필터 초기화 - URL 검색 시 항상 카테고리 초기화
      setSelectedCategory([]);
      
      // 페이지가 새로고침된 경우 (브라우저 새로고침)
      if (initialRenderRef.current && !initialSearchPerformed.current) {
        // 초기 렌더링 플래그 설정
        initialRenderRef.current = false;
        initialSearchPerformed.current = true;
        
        console.log(`[디버그] 페이지 초기 로드 감지: 검색 로직 시작`);
        
        if (useExistingParam === 'true') {
          console.log(`[디버그] 페이지 새로고침 감지: 기존 결과 사용 모드로 검색 시작 (${queryParam}), USE_EXISTING=TRUE`);
          // 기존 결과 사용 모드 설정
          setSearchMode('existing');
          // 기존 검색 결과 로드 함수 호출
          searchWithExisting(queryParam);
        } else {
          console.log(`[디버그] 페이지 새로고침 감지: 새 검색 모드로 검색 시작 (${queryParam}), USE_EXISTING=FALSE`);
          // 새 검색 모드 설정
          setSearchMode('new');
          // 새 검색 수행
          const formEvent = { preventDefault: () => {} } as React.FormEvent;
          handleSearch(formEvent);
        }
      }
    }
  }, []);

  // 필터 작동에 대한 디버그 로그 - 개발 시 도움이 됨
  useEffect(() => {
    if (currentSearchId && selectedCategory.length > 0) {
      console.log(`[디버그] 필터 활성화됨: 검색ID ${currentSearchId}, 선택된 카테고리: ${selectedCategory.join(', ')}`);
    }
  }, [currentSearchId, selectedCategory]);

  // 검색 완료시 URL 파라미터 추가를 위한 useEffect
  useEffect(() => {
    // 검색이 완료되었을 때 URL에 use_existing=true 파라미터 추가
    if (searchMode === 'new' && searchStatus && searchStatus.is_completed && searchStatus.completion_percentage === 100) {
      const currentUrl = new URL(window.location.href);
      if (!currentUrl.searchParams.has('use_existing')) {
        currentUrl.searchParams.set('use_existing', 'true');
        window.history.pushState({}, '', currentUrl.toString());
        console.log('[디버그] 검색 완료: URL에 use_existing=true 파라미터 추가됨');
      }
    }
  }, [searchMode, searchStatus, searchTerm]);

  return (
    <div className="home-container">
      {/* 검색 섹션 */}
      <section className="section pb-0">
        <div className="container">
          <div className="search-form mb-5">
            
            <form onSubmit={handleSearch} ref={searchFormRef}>
              <div className="field">
                <div className="control has-icons-left has-icons-right">
                  <input
                    type="text"
                    className="input search-input"
                    placeholder="검색어를 입력해주세요"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <span className="icon is-left">
                    <div className="search-location">
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" data-seed-icon="true" data-seed-icon-version="0.0.10" width="18" height="18">
                        <g>
                          <path d="M12.0022 0.498047C6.10466 0.498047 2.06836 4.96307 2.06836 10.4215C2.06836 14.28 4.55706 17.553 6.82617 19.7593C7.98687 20.8782 9.1371 21.7775 10.005 22.3944C10.4679 22.7331 10.9513 23.0575 11.448 23.346C11.7722 23.5342 12.2218 23.5551 12.546 23.3669C13.0436 23.078 13.5163 22.7313 13.989 22.4049C14.8569 21.7879 16.0072 20.8887 17.1679 19.7698C19.437 17.5634 21.9257 14.3009 21.9257 10.4319C21.9361 4.96307 17.8998 0.498047 12.0022 0.498047ZM12.0022 14.4787C9.76451 14.4787 7.94504 12.6592 7.94504 10.4215C7.94504 8.18374 9.76451 6.36427 12.0022 6.36427C14.24 6.36427 16.0595 8.18374 16.0595 10.4215C16.0595 12.6592 14.24 14.4787 12.0022 14.4787Z" fill="currentColor"></path>
                        </g>
                      </svg>
                      <span className="ml-1 has-text-weight-semibold is-size-6">전국검색</span>
                    </div>
                  </span>
                  
                  {searchTerm && (
                    <button 
                      className="search-clear-button"
                      type="button"
                      onClick={() => setSearchTerm('')}
                      aria-label="검색어 지우기"
                    >
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" data-seed-icon="true" data-seed-icon-version="0.0.10" width="18" height="18">
                        <g>
                          <path fill-rule="evenodd" clip-rule="evenodd" d="M0.800781 11.9998C0.800781 5.81706 5.81804 0.799805 12.0008 0.799805C18.1835 0.799805 23.2008 5.81706 23.2008 11.9998C23.2008 18.1825 18.1835 23.1998 12.0008 23.1998C5.81804 23.1998 0.800781 18.1825 0.800781 11.9998ZM8.46537 8.46574C8.8559 8.07522 9.48906 8.07522 9.87959 8.46574L12.0006 10.5868L14.1216 8.46574C14.5121 8.07522 15.1453 8.07522 15.5358 8.46574C15.9264 8.85627 15.9264 9.48943 15.5358 9.87996L13.4148 12.001L15.5364 14.1226C15.927 14.5131 15.927 15.1463 15.5364 15.5368C15.1459 15.9273 14.5128 15.9273 14.1222 15.5368L12.0006 13.4152L9.87898 15.5368C9.48846 15.9273 8.85529 15.9273 8.46477 15.5368C8.07424 15.1463 8.07424 14.5131 8.46477 14.1226L10.5864 12.001L8.46537 9.87996C8.07485 9.48943 8.07485 8.85627 8.46537 8.46574Z" fill="#b0b3ba"></path>
                        </g>
                      </svg>
                    </button>
                  )}
                  
                  <button 
                    className="search-icon-button"
                    type="submit"
                    aria-label="검색"
                    disabled={loading}
                    ref={searchButtonRef}
                  >
                    {loading ? (
                      <i className="fas fa-spinner fa-spin"></i>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" data-seed-icon="true" data-seed-icon-version="0.0.10" width="16" height="16">
                        <g>
                          <path fill-rule="evenodd" clip-rule="evenodd" d="M11.6507 2.15225C11.1821 2.62088 11.1821 3.38068 11.6507 3.84931L18.1022 10.3008H2.99922C2.33648 10.3008 1.79922 10.8381 1.79922 11.5008C1.79922 12.1635 2.33648 12.7008 2.99922 12.7008H18.1022L11.6507 19.1523C11.1821 19.6209 11.1821 20.3807 11.6507 20.8493C12.1193 21.3179 12.8791 21.3179 13.3477 20.8493L21.8477 12.3493C22.0728 12.1243 22.1992 11.8191 22.1992 11.5008C22.1992 11.1825 22.0728 10.8773 21.8477 10.6523L13.3477 2.15225C12.8791 1.68362 12.1193 1.68362 11.6507 2.15225Z" fill="#ffffff"></path>
                        </g>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              
              {/* 최근 검색어 */}
              {recentSearches.length > 0 && (
                <div className="mt-3">
                  <div className="recent-searches-container">
                    <div className={`tags recent-searches ${showAllRecentSearches ? 'expanded' : ''}`} ref={tagsContainerRef}>
                      <span className="is-size-7 has-text-grey recent-search-label">최근 검색어</span>
                      {/* 날짜 기준으로 정렬된 검색어와 더보기 버튼 표시 */}
                      {(() => {
                        // 날짜 기준으로 정렬 및 40개로 제한
                        const sortedSearches = [...recentSearches]
                          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                          .slice(0, 40);

                        // 표시할 검색어와 숨길 검색어로 분리
                        const visibleSearches = showAllRecentSearches ? sortedSearches : sortedSearches.slice(0, visibleTagsCount);
                        const hiddenCount = sortedSearches.length - visibleTagsCount;
                        
                        // 각 검색어를 JSX 요소로 변환
                        const searchElements = visibleSearches.map((search, index) => (
                          <span 
                            key={index} 
                            className="tag is-medium is-light is-clickable recent-keyword" 
                            onClick={() => searchWithRecent(search.query)}
                          >
                            {search.query}
                            {search.progress !== undefined ? (
                              search.progress < 100 ? (
                                <span className="ml-1 has-text-info">({Math.floor(search.progress)}%)</span>
                              ) : null
                            ) : null}
                            {search.is_completed === false && search.failed_processes && search.failed_processes > 0 && search.progress !== undefined && (
                              <span className="ml-1 has-text-danger">실패 {Math.floor((search.failed_processes / (search.progress + search.failed_processes)) * 100)}%</span>
                            )}
                          </span>
                        ));
                        
                        // 더보기 버튼 요소 - 숨겨진 항목이 2개 이상이고 펼치지 않은 상태일 때만 표시
                        const moreButtonElement = !showAllRecentSearches && hiddenCount >= 2 ? (
                          <span 
                            key="more-button"
                            className="tag is-medium show-more-tag" 
                            onClick={(e) => {
                              e.stopPropagation(); // 이벤트 버블링 방지
                              setShowAllRecentSearches(true);
                            }}
                          >
                            {hiddenCount}개 더보기
                          </span>
                        ) : null;
                        
                        // 최종 결과 반환
                        return [...searchElements, moreButtonElement];
                      })()}
                    </div>
                    
                    {/* 디버그 정보 표시 - 관리자에게만 표시 */}
                    {showDebugInfo && debugInfo && isAdmin && (
                      <div className="notification is-info is-light mt-2 p-3">
                        <p className="is-size-7">
                          <strong>🔍 디버그 정보:</strong><br/>
                          <span>actual 브라우저 가로길이: {debugInfo.windowWidth}px</span><br/>
                          <span>recent-searches 가로길이: {debugInfo.containerWidth}px</span><br/>
                          <span>브라우저 540px 초과: {debugInfo.isBrowserWider ? 'O' : 'X'}</span><br/>
                          <span>더보기 버튼 출력: {debugInfo.needMoreButton ? 'O' : 'X'}</span><br/>
                          <span>더보기 버튼 가로길이: {debugInfo.moreButtonWidth}px</span><br/>
                          <span>보이는 태그 개수: {debugInfo.visibleCount}</span><br/>
                          <span>태그 크기 정보:</span><br/>
                          {debugInfo.tagWidths.slice(0, debugInfo.visibleCount).map((width, i) => (
                            <span key={i}>
                              태그 #{i+1}: {width}px × {debugInfo.tagHeights[i]}px{i < debugInfo.visibleCount - 1 ? ', ' : ''}
                            </span>
                          ))}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* 검색 결과 섹션 */}
      {isSearched && (
        <section className="section pt-0">
          <div className="container">
            <div className="is-flex is-justify-content-space-between is-align-items-center mb-4">
              <div className="is-flex is-align-items-center">
                {/* 모바일 필터 버튼 */}
                <div className="filter-button-container">
                  <button 
                    className="button is-small filter-button"
                    onClick={toggleFilterModal}
                  >
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" data-seed-icon="true" data-seed-icon-version="0.0.10" width="18" height="18"><g><g><path fill-rule="evenodd" clip-rule="evenodd" d="M9.99331 7.24609H3C2.44772 7.24609 2 6.79838 2 6.24609C2 5.69381 2.44772 5.24609 3 5.24609H9.99331C10.443 3.38141 12.1222 1.99609 14.125 1.99609C16.1278 1.99609 17.807 3.38141 18.2567 5.24609H21C21.5523 5.24609 22 5.69381 22 6.24609C22 6.79838 21.5523 7.24609 21 7.24609H18.2567C17.807 9.11078 16.1278 10.4961 14.125 10.4961C12.1222 10.4961 10.443 9.11078 9.99331 7.24609ZM11.875 6.24609C11.875 5.00345 12.8824 3.99609 14.125 3.99609C15.3676 3.99609 16.375 5.00345 16.375 6.24609C16.375 7.48873 15.3676 8.49609 14.125 8.49609C12.8824 8.49609 11.875 7.48873 11.875 6.24609Z" fill="currentColor"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M6.25 13.4956C3.90279 13.4956 2 15.3984 2 17.7456C2 20.0928 3.90279 21.9956 6.25 21.9956C8.25016 21.9956 9.92761 20.6139 10.3799 18.7529L20.9996 18.7456C21.5518 18.7452 21.9993 18.2972 21.9989 17.7449C21.9985 17.1926 21.5505 16.7452 20.9982 16.7456L10.3834 16.7529C9.93635 14.8845 8.25537 13.4956 6.25 13.4956ZM4 17.7456C4 16.503 5.00736 15.4956 6.25 15.4956C7.49264 15.4956 8.5 16.503 8.5 17.7456C8.5 18.9882 7.49264 19.9956 6.25 19.9956C5.00736 19.9956 4 18.9882 4 17.7456Z" fill="currentColor"></path></g></g></svg>
                    <span>필터</span>
                  </button>
                  
                  {(onlyAvailable || sortBy !== 'created_at_desc' || selectedCategory.length > 0) && (
                    <button 
                      className="filter-reset-button"
                      onClick={resetAllFilters}
                    >
                      필터 초기화
                    </button>
                  )}
                </div>
                
                <div>
                  {(onlyAvailable || sortBy !== 'created_at_desc' || selectedCategory.length > 0) && (
                    <button 
                      className="filter-reset-button"
                      onClick={resetAllFilters}
                    >
                      필터 초기화
                    </button>
                  )}
                </div>
                
                {!loading && (
                  <h3 className="title is-4 mb-0 has-text-weight-bold result-title desktop-only" style={{color: '#1a1c20'}}>
                    {searchResults.length > 0 && pagination ? 
                      `전국에있는 "${searchTerm}" 검색결과 ${pagination.total_items}개` : 
                      searchResults.length > 0 ? 
                        `전국에있는 "${searchTerm}" 검색결과 ${searchResults.length}개` : 
                        `"${searchTerm}" 검색결과가 없습니다`}
                  </h3>
                )}
              </div>
              
              {/* 뷰 모드 전환 버튼 */}
              <div className="view-mode-toggle" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button 
                  className="button is-small"
                  onClick={() => setViewMode('gallery')}
                  style={{ 
                    backgroundColor: viewMode === 'gallery' ? '#ff6600' : 'white',
                    color: viewMode === 'gallery' ? 'white' : '#333',
                    borderColor: '#ddd'
                  }}
                  aria-label="갤러리 뷰"
                >
                  <span className="icon">
                    <i className="fas fa-th"></i>
                  </span>
                  <span>갤러리</span>
                </button>
                <button 
                  className="button is-small"
                  onClick={() => setViewMode('list')}
                  style={{ 
                    backgroundColor: viewMode === 'list' ? '#ff6600' : 'white',
                    color: viewMode === 'list' ? 'white' : '#333',
                    borderColor: '#ddd'
                  }}
                  aria-label="리스트 뷰"
                >
                  <span className="icon">
                    <i className="fas fa-list"></i>
                  </span>
                  <span>리스트</span>
                </button>
              </div>
            </div>
            
            {/* 디버그 정보 */}
            {currentSearchId && showDebugInfo && isAdmin && (
              <div className="notification is-warning is-light mb-4">
                <p className="is-size-7">
                  <strong>[디버그 정보]</strong><br/>
                  검색 ID: {currentSearchId}<br/>
                  정렬: {sortBy}, 거래 가능만: {onlyAvailable ? '예' : '아니오'}<br/>
                  선택된 카테고리: {selectedCategory.length > 0 ? 
                    selectedCategory.map(id => CATEGORIES.find(c => c.id === id)?.name).join(', ') : 
                    '전체'}<br/>
                  선택된 카테고리 ID: {selectedCategory.join(', ') || '없음'}<br/>
                  현재 결과 항목 수: {searchResults.length}<br/>
                  API 총 항목 수: {pagination ? pagination.total_items : '정보 없음'}<br/>
                  <strong>API 호출 URL:</strong> {`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/search/results/${currentSearchId}?page=1&page_size=20&sort_by=${sortBy}&only_available=${onlyAvailable}${selectedCategory.length > 0 ? selectedCategory.map(id => `&category_id=${id}`).join('') : ''}`}
                </p>
              </div>
            )}
            
            <div className="search-results-container">
              {/* 좌측 필터 컬럼 */}
              <div className="filter-sidebar">
                <div className="filter-content filter-sticky">
                  <div className="filter-heading-container">
                    <h3 className="filter-heading">필터</h3>
                    <button 
                      className="reset-filters-btn"
                      onClick={resetAllFilters}
                    >
                      초기화
                    </button>
                  </div>
                  
                  {/* 거래 가능 필터 */}
                  <div className="filter-section">
                    <div className="field">
                      <label className="custom-checkbox">
                        <input
                          type="checkbox"
                          checked={onlyAvailable}
                          onChange={handleOnlyAvailableToggle}
                          className="custom-checkbox-input"
                        />
                        <span className="custom-checkbox-mark">
                          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g>
                              <path fillRule="evenodd" clipRule="evenodd" d="M22.2424 3.55704C22.7631 3.96703 22.8529 4.72151 22.4429 5.24222L10.6321 20.2422C10.4172 20.5151 10.0945 20.6816 9.74756 20.6984C9.40059 20.7153 9.06333 20.581 8.82295 20.3302L1.63376 12.8302C1.17515 12.3518 1.19122 11.5922 1.66966 11.1336C2.1481 10.675 2.90773 10.691 3.36634 11.1695L9.60035 17.673L20.5572 3.75749C20.9672 3.23679 21.7217 3.14705 22.2424 3.55704Z" fill="currentColor"></path>
                            </g>
                          </svg>
                        </span>
                        <span className="custom-checkbox-label">거래 가능만 보기</span>
                      </label>
                    </div>
                  </div>
                  
                  {/* 필터 디바이더 */}
                  <div className="filter-divider"></div>
                  
                  {/* 정렬 필터 변경 */}
                  <div className="filter-section">
                    <div className="filter-section-title">정렬</div>
                    <div className="field">
                      <div className="control">
                        <div className="sort-buttons">
                          <button 
                            className={`sort-button ${sortBy === 'created_at_desc' ? 'active' : ''}`}
                            onClick={() => handleSortChange('created_at_desc')}
                          >
                            최신순
                          </button>
                          <div className="sort-button-divider"></div>
                          <button 
                            className={`sort-button ${sortBy === 'price_asc' ? 'active' : ''}`}
                            onClick={() => handleSortChange('price_asc')}
                          >
                            가격낮은순
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 필터 디바이더 */}
                  <div className="filter-divider"></div>
                  
                  {/* 카테고리 필터 */}
                  <div className="filter-section">
                    <div>
                      <div className="category-header">
                        <span className="category-title">카테고리</span>
                        {selectedCategory.length > 0 && (
                          <button 
                            className="category-reset-btn"
                            onClick={() => handleCategorySelect(null)}
                          >
                            모두해제
                          </button>
                        )}
                      </div>
                      
                      {CATEGORIES.map(category => (
                        <div key={category.id} className="category-item">
                          <label className="custom-checkbox">
                            <input
                              type="checkbox"
                              checked={selectedCategory.includes(category.id)}
                              onChange={() => handleCategorySelect(category.id)}
                              className="custom-checkbox-input"
                            />
                            <span className="custom-checkbox-mark">
                              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <g>
                                  <path fillRule="evenodd" clipRule="evenodd" d="M22.2424 3.55704C22.7631 3.96703 22.8529 4.72151 22.4429 5.24222L10.6321 20.2422C10.4172 20.5151 10.0945 20.6816 9.74756 20.6984C9.40059 20.7153 9.06333 20.581 8.82295 20.3302L1.63376 12.8302C1.17515 12.3518 1.19122 11.5922 1.66966 11.1336C2.1481 10.675 2.90773 10.691 3.36634 11.1695L9.60035 17.673L20.5572 3.75749C20.9672 3.23679 21.7217 3.14705 22.2424 3.55704Z" fill="currentColor"></path>
                                </g>
                              </svg>
                            </span>
                            <img 
                              src={category.image} 
                              alt={category.name} 
                              style={{width: '20px', height: '20px', marginLeft: '8px'}}
                            />
                            <span className="custom-checkbox-label">
                              {category.name} 
                              <span className={`category-count ${!categoryCount[category.id] || categoryCount[category.id] === 0 ? 'category-count-zero' : ''}`}>
                                {categoryCount[category.id] || 0}
                              </span>
                            </span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* 디버그 정보 버튼 - 관리자만 볼 수 있음 */}
                  {currentSearchId && isAdmin && (
                    <div className="filter-section mt-4 pt-2" style={{ borderTop: '1px solid #eee' }}>
                      <button 
                        className={`button is-small is-fullwidth ${showDebugInfo ? 'is-warning' : 'is-light'}`}
                        onClick={() => setShowDebugInfo(!showDebugInfo)}
                      >
                        <span className="icon is-small">
                          <i className={`fas ${showDebugInfo ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </span>
                        <span>{showDebugInfo ? '디버그 정보 숨기기' : '디버그 정보 보기'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* 검색 결과 본문 */}
              <div className="search-results-main" style={{flex: 1}} ref={searchResultsMainRef}>
                {/* 기존 검색 결과 표시 */}
                {searchMode === 'existing' && latestSearchTime && latestSearchTime.latest_time && (
                  <div className="notification is-info is-light mb-4">
                    <div className="is-flex is-justify-content-space-between is-align-items-center" style={{
                      justifyContent: "center !important",
                      gap: "18px",
                      flexWrap: "wrap"
                    }}>
                      <strong>아래 검색결과는 {formatTimeAgo(latestSearchTime.latest_time)} 기준 결과입니다</strong>
                      <button 
                        className="button is-primary is-small"
                        style={{
                          alignItems: "center",
                          display: "flex",
                          gap: "4px",
                          height: "35px"
                        }}
                        onClick={() => {
                          // URL에서 use_existing 파라미터 제거
                          const currentUrl = new URL(window.location.href);
                          currentUrl.searchParams.delete('use_existing');
                          window.history.pushState({}, '', currentUrl.toString());
                          
                          // 검색 모드를 'new'로 설정 (새 검색 요청임을 표시)
                          setSearchMode('new');
                          
                          // 새 검색 실행
                          handleSearch({ preventDefault: () => {} } as React.FormEvent);
                        }}
                      >
                        "{searchTerm}" 최신결과 검색하기
                        <div style={{
                          backgroundColor: "#fff",
                          borderRadius: "9999px",
                          width: "20px",
                          height: "20px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}>
                          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" data-seed-icon="true" data-seed-icon-version="0.0.10" width="13" height="13">
                            <g>
                              <path fillRule="evenodd" clipRule="evenodd" d="M11.6507 2.15225C11.1821 2.62088 11.1821 3.38068 11.6507 3.84931L18.1022 10.3008H2.99922C2.33648 10.3008 1.79922 10.8381 1.79922 11.5008C1.79922 12.1635 2.33648 12.7008 2.99922 12.7008H18.1022L11.6507 19.1523C11.1821 19.6209 11.1821 20.3807 11.6507 20.8493C12.1193 21.3179 12.8791 21.3179 13.3477 20.8493L21.8477 12.3493C22.0728 12.1243 22.1992 11.8191 22.1992 11.5008C22.1992 11.1825 22.0728 10.8773 21.8477 10.6523L13.3477 2.15225C12.8791 1.68362 12.1193 1.68362 11.6507 2.15225Z" fill="#000"></path>
                            </g>
                          </svg>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
                
                {/* 모바일용 타이틀 */}
                {!loading && (
                  <h3 className="title is-4 mb-5 has-text-weight-bold result-title mobile-only" style={{color: '#1a1c20'}}>
                    {searchResults.length > 0 && pagination ? 
                      `"${searchTerm}" 검색결과 ${pagination.total_items}개` : 
                      searchResults.length > 0 ? 
                        `"${searchTerm}" 검색결과 ${searchResults.length}개` : 
                        `"${searchTerm}" 검색결과가 없습니다`}
                  </h3>
                )}
                
                {loading && searchResults.length === 0 ? (
                  <div className="py-5">
                    {/* 검색 진행률 표시 - 초기 로딩 시 */}
                    {searchMode === 'new' && (
                      <div className="notification is-info is-light mb-4">
                        <div className="is-flex is-align-items-center">
                          <progress 
                            className="progress is-primary" 
                            value={searchStatus ? searchStatus.completion_percentage : 0} 
                            max="100"
                            style={{ flexGrow: 1, marginRight: '10px' }}
                          ></progress>
                          <span>{Math.round(searchStatus ? searchStatus.completion_percentage : 0)}%</span>
                        </div>
                      </div>
                    )}
                    
                    {/* 로딩 중에 스켈레톤 UI 표시 */}
                    {viewMode === 'gallery' ? (
                      <div className="search-results-grid">
                        {renderSkeletonItems()}
                      </div>
                    ) : (
                      <div className="search-results-list">
                        {renderListSkeletonItems()}
                      </div>
                    )}
                  </div>
                ) : searchError ? (
                  <div className="notification is-danger">
                    <strong>검색 오류:</strong> {searchError}
                  </div>
                ) : searchResults.length > 0 ? (
                  <div>
                    {/* 검색 진행률 표시 - 결과가 있는 경우 */}
                    {(() => {
                      console.log('[디버그] 프로그레스바 렌더링 조건 검사:');
                      console.log('[디버그] searchMode:', searchMode);
                      console.log('[디버그] loading:', loading);
                      console.log('[디버그] searchStatus 존재:', !!searchStatus);
                      console.log('[디버그] total_processes > 0:', searchStatus && searchStatus.total_processes > 0);
                      console.log('[디버그] !is_completed:', searchStatus ? !searchStatus.is_completed : 'searchStatus 없음');
                      
                      // 검색 중이고 새 검색 모드인 경우 진행 상태 표시
                      if (searchMode === 'new' && (loading || (searchStatus && !searchStatus.is_completed))) {
                        const percentage = searchStatus ? searchStatus.completion_percentage : 0;
                        const completedProcesses = searchStatus ? searchStatus.completed_processes : 0;
                        const totalProcesses = searchStatus ? searchStatus.total_processes : 1;
                        const totalItemsFound = searchStatus ? searchStatus.total_items_found : 0;
                        
                        console.log('[디버그] 프로그레스바 표시 조건 충족됨');
                        return (
                          <div className="notification is-info is-light mb-4">
                            <div className="is-flex is-align-items-center">
                              <progress 
                                className="progress is-primary" 
                                value={percentage} 
                                max="100"
                                style={{ flexGrow: 1, marginRight: '10px' }}
                              ></progress>
                              <span>{Math.round(percentage)}%</span>
                            </div>
                            <p className="is-size-7 mt-1">
                              {searchStatus ? (
                                <>검색이 진행 중입니다1
                                </>
                              ) : (
                                <>검색이 진행 중입니다2</>
                              )}
                            </p>
                          </div>
                        );
                      }
                      console.log('[디버그] 프로그레스바 표시 조건 불충족');
                      return null;
                    })()}
                    
                    {/* 검색 완료 메시지 (100% 완료시) */}
                    {searchMode === 'new' && searchStatus && searchStatus.is_completed && searchStatus.completion_percentage === 100 && (
                      <div className="notification is-success is-light mb-4">
                        <strong>"{searchTerm}" 전국검색이 완료되었습니다</strong>
                      </div>
                    )}
                    
                    {/* 실제 검색 결과 */}
                    {viewMode === 'gallery' ? (
                      <div className={`search-results-grid ${isLoadingSkeleton ? 'loading-grid' : ''}`}>
                        {isLoadingSkeleton ? (
                          // 스켈레톤 UI
                          renderSkeletonItems()
                        ) : (
                          // 갤러리 뷰 - 기존 그리드 형태
                          searchResults.map((item, index) => (
                            <a 
                              key={`${item.link}`} 
                              className={`search-item-card ${updatedItems.includes(item.link) ? 'flash-effect' : ''} ${(item.is_new === true) ? 'new-item' : ''}`}
                              href={item.link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              {item.is_new === true && (
                                <div className="new-item-badge">N</div>
                              )}
                              <div className="search-item-thumbnail">
                                {getStatusLabel(item.status)}
                                <img src={getThumbnailImage(item)} alt={item.title} />
                              </div>
                              
                              <div className="search-item-content">
                                <h3 className="search-item-title">
                                  {item.title}
                                </h3>
                                
                                <p className="search-item-description" style={{ 
                                  display: '-webkit-box', 
                                  WebkitLineClamp: 2, 
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  {item.content}
                                </p>

                                <div className="mt-2 mb-2">
                                  <span className="price-display">
                                    {formatPrice(item.price)}
                                  </span>
                                </div>
                                
                                <div className="search-item-meta">
                                  <span>
                                    {item.sido ? `${item.sido.substring(0, 2)} ${item.location}` : (item.location || '위치 정보 없음')}
                                  </span>
                                  <span className="mx-1">·</span>
                                  <span>
                                    {isReposted(item.created_at_origin, item.boosted_at) ? (
                                      <>끌올 {formatTimeAgo(item.created_at_origin)}</>
                                    ) : (
                                      formatTimeAgo(item.created_at_origin)
                                    )}
                                  </span>
                                </div>
                              </div>
                            </a>
                          ))
                        )}
                      </div>
                    ) : (
                      // 리스트 뷰 - 한 줄에 하나씩 표시
                      <div className="search-results-list">
                        {isLoadingSkeleton ? (
                          // 리스트 뷰 스켈레톤 UI
                          renderListSkeletonItems()
                        ) : (
                          // 리스트 뷰 데이터
                          searchResults.map((item, index) => (
                            <a 
                              key={`${item.link}-list`} 
                              className={`search-item-list ${updatedItems.includes(item.link) ? 'flash-effect' : ''} ${(item.is_new === true) ? 'new-item' : ''}`}
                              href={item.link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              <div className="search-item-list-thumb">
                                {getStatusLabel(item.status)}
                                <img src={getThumbnailImage(item)} alt={item.title} />
                                {item.is_new === true && (
                                  <div className="new-item-badge" style={{ top: '-5px', right: '-5px', width: '18px', height: '18px', fontSize: '10px' }}>N</div>
                                )}
                              </div>
                              
                              <div className="search-item-list-content">
                                <div className="search-item-list-main">
                                  <div className="search-item-list-title">{item.title}</div>
                                  <div className="search-item-list-bottom-row">
                                    <div className="search-item-list-desc">{item.content}</div>
                                    <div className="search-item-list-location">
                                      {item.sido ? `${item.sido.substring(0, 2)} ${item.location}` : (item.location || '위치 정보 없음')}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="search-item-list-meta">
                                  <div className="search-item-list-price">{formatPrice(item.price)}</div>
                                  <div className="search-item-list-time">
                                    {isReposted(item.created_at_origin, item.boosted_at) ? (
                                      <>끌올 {formatTimeAgo(item.created_at_origin)}</>
                                    ) : (
                                      formatTimeAgo(item.created_at_origin)
                                    )}
                                  </div>
                                </div>
                              </div>
                            </a>
                          ))
                        )}
                      </div>
                    )}
                    
                    {/* 무한 스크롤 로드 더보기 영역 */}
                    {hasNextPage && (
                      <div 
                        ref={loadMoreRef} 
                        className="is-flex is-justify-content-center py-5"
                      >
                        {isLoadingMore ? (
                          <div className="loader"></div>
                        ) : (
                          <p className="has-text-grey">더 많은 결과 로드 중...</p>
                        )}
                      </div>
                    )}
                    
                    {/* 페이지 정보 표시 */}
                    {pagination && (
                      <div className="has-text-centered mt-4 mb-2">
                        <p className="is-size-7 has-text-grey">
                          {pagination.total_items}개 항목 중 {searchResults.length}개 표시 중 
                          (페이지 {pagination.current_page}/{pagination.total_pages})
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="has-text-centered is-flex is-justify-content-center is-align-items-center" style={{ height: "200px" }}>
                    <h3 className="has-text-weight-bold" style={{ fontSize: "1.2rem" }}>
                      <strong>아무것도 없어요</strong>
                    </h3>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
      
      {/* 필터 모달 */}
      <div className={`modal filter-modal ${isFilterModalOpen ? 'is-active' : ''}`}>
        <div className="modal-background" onClick={toggleFilterModal}></div>
        <div className="modal-card">
          <header className="modal-card-head">
            <p className="modal-card-title">중고거래 검색 필터</p>
            <div 
              className="close-icon" 
              onClick={toggleFilterModal}
            >
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" data-seed-icon="true" data-seed-icon-version="0.0.10" width="24" height="24">
                <g>
                  <path d="M20.7071 4.70711C21.0976 4.31658 21.0976 3.68342 20.7071 3.29289C20.3166 2.90237 19.6834 2.90237 19.2929 3.29289L12 10.5858L4.70711 3.29289C4.31658 2.90237 3.68342 2.90237 3.29289 3.29289C2.90237 3.68342 2.90237 4.31658 3.29289 4.70711L10.5858 12L3.29289 19.2929C2.90237 19.6834 2.90237 20.3166 3.29289 20.7071C3.68342 21.0976 4.31658 21.0976 4.70711 20.7071L12 13.4142L19.2929 20.7071C19.6834 21.0976 20.3166 21.0976 20.7071 20.7071C21.0976 20.3166 21.0976 19.6834 20.7071 19.2929L13.4142 12L20.7071 4.70711Z" fill="currentColor"></path>
                </g>
              </svg>
            </div>
          </header>
          <section className="modal-card-body">
            {/* 거래 가능 필터 */}
            <div className="filter-section">
              <div className="field">
                <label className="custom-checkbox">
                  <input
                    type="checkbox"
                    checked={onlyAvailable}
                    onChange={handleOnlyAvailableToggle}
                    className="custom-checkbox-input"
                  />
                  <span className="custom-checkbox-mark">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <g>
                        <path fillRule="evenodd" clipRule="evenodd" d="M22.2424 3.55704C22.7631 3.96703 22.8529 4.72151 22.4429 5.24222L10.6321 20.2422C10.4172 20.5151 10.0945 20.6816 9.74756 20.6984C9.40059 20.7153 9.06333 20.581 8.82295 20.3302L1.63376 12.8302C1.17515 12.3518 1.19122 11.5922 1.66966 11.1336C2.1481 10.675 2.90773 10.691 3.36634 11.1695L9.60035 17.673L20.5572 3.75749C20.9672 3.23679 21.7217 3.14705 22.2424 3.55704Z" fill="currentColor"></path>
                      </g>
                    </svg>
                  </span>
                  <span className="custom-checkbox-label">거래 가능만 보기</span>
                </label>
              </div>
            </div>
            <div className="filter-divider"></div>
            
            {/* 정렬 필터 변경 */}
            <div className="filter-section">
              <div className="filter-section-title">정렬</div>
              <div className="field">
                <div className="control">
                  <div className="sort-buttons">
                    <button 
                      className={`sort-button ${sortBy === 'created_at_desc' ? 'active' : ''}`}
                      onClick={() => handleSortChange('created_at_desc')}
                    >
                      최신순
                    </button>
                    <div className="sort-button-divider"></div>
                    <button 
                      className={`sort-button ${sortBy === 'price_asc' ? 'active' : ''}`}
                      onClick={() => handleSortChange('price_asc')}
                    >
                      가격낮은순
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="filter-divider"></div>
            {/* 카테고리 필터 */}
            <div className="filter-section">
              <div className="category-header">
                <span className="category-title">카테고리</span>
                {selectedCategory.length > 0 && (
                  <button 
                    className="category-reset-btn"
                    onClick={() => handleCategorySelect(null)}
                  >
                    모두해제
                  </button>
                )}
              </div>
              
              <div className="category-items-container">
                {CATEGORIES.map(category => (
                  <div key={category.id} className="category-item">
                    <label className="custom-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedCategory.includes(category.id)}
                        onChange={() => handleCategorySelect(category.id)}
                        className="custom-checkbox-input"
                      />
                      <span className="custom-checkbox-mark">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <g>
                            <path fillRule="evenodd" clipRule="evenodd" d="M22.2424 3.55704C22.7631 3.96703 22.8529 4.72151 22.4429 5.24222L10.6321 20.2422C10.4172 20.5151 10.0945 20.6816 9.74756 20.6984C9.40059 20.7153 9.06333 20.581 8.82295 20.3302L1.63376 12.8302C1.17515 12.3518 1.19122 11.5922 1.66966 11.1336C2.1481 10.675 2.90773 10.691 3.36634 11.1695L9.60035 17.673L20.5572 3.75749C20.9672 3.23679 21.7217 3.14705 22.2424 3.55704Z" fill="currentColor"></path>
                          </g>
                        </svg>
                      </span>
                      <img 
                        src={category.image} 
                        alt={category.name} 
                        style={{width: '20px', height: '20px', marginLeft: '8px'}}
                      />
                      <span className="custom-checkbox-label">
                        {category.name} 
                        <span className={`category-count ${!categoryCount[category.id] || categoryCount[category.id] === 0 ? 'category-count-zero' : ''}`}>
                          {categoryCount[category.id] || 0}
                        </span>
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            {/* 디버그 정보 버튼 - 관리자만 볼 수 있음 */}
            {currentSearchId && isAdmin && (
              <div className="filter-section mt-4 pt-2" style={{ borderTop: '1px solid #eee' }}>
                <button 
                  className={`button is-small is-fullwidth ${showDebugInfo ? 'is-warning' : 'is-light'}`}
                  onClick={() => setShowDebugInfo(!showDebugInfo)}
                >
                  <span className="icon is-small">
                    <i className={`fas ${showDebugInfo ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </span>
                  <span>{showDebugInfo ? '디버그 정보 숨기기' : '디버그 정보 보기'}</span>
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

// 필터 관련 스타일 추가
const styles = `
  /* 필터 헤딩 컨테이너 스타일 */
  .filter-heading-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  /* 필터 헤딩 스타일 */
  .filter-heading {
    font-size: 20px;
    font-weight: 700;
    color: #1a1c20;
    margin: 0;
  }

  /* 초기화 버튼 스타일 */
  .reset-filters-btn {
    background: none;
    border: none;
    color: #666;
    text-decoration: underline;
    font-size: 14px;
    cursor: pointer;
    padding: 4px;
  }
  
  /* 필터 디바이더 */
  .filter-divider {
    height: 1px;
    background-color: #f3f4f5;
    margin: 16px 0;
  }
  
  /* 카테고리 헤더 스타일 */
  .category-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  
  /* 카테고리 제목 스타일 */
  .category-title {
  font-weight: 700;
  color: #1a1c20;
  font-size: 16px;
  }
  
  /* 카테고리 초기화 버튼 스타일 */
  .category-reset-btn {
    background: none;
    border: none;
    color: #666;
    text-decoration: underline;
    font-size: 14px;
    cursor: pointer;
    padding: 4px;
  }
  
  /* 카테고리 개수 태그 스타일 */
  .category-count {
    display: inline-block;
    background-color: #f5f5f5;
    color: #333;
    font-size: 11px;
    font-weight: 600;
    padding: 1px 6px;
    border-radius: 10px;
    margin-left: 1px;
  }
  
  /* 카테고리 개수 0개일 때 스타일 */
  .category-count-zero {
    background-color: unset;
    color: #dcdcdc;
    font-weight: 400;
  }
`;

export default Home; 