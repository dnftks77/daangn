import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { isAuthenticated } from '../services/auth';
import './Trend.css'; // CSS 파일 추가 필요

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

// 검색 시간 응답 타입 정의
interface LatestSearchTime {
  query: string;
  has_results: boolean;
  latest_time: string | null;
}

// 중고나라 랭킹 타입 정의
interface JoongnaRank {
  rank: number;
  keyword: string;
}

function Trend() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [showAllRecentSearches, setShowAllRecentSearches] = useState<boolean>(false);
  const [visibleTagsCount, setVisibleTagsCount] = useState<number>(40);
  const [joongnaRankings, setJoongnaRankings] = useState<JoongnaRank[]>([]);
  const [loadingJoongna, setLoadingJoongna] = useState(false);
  const tagsContainerRef = useRef<HTMLDivElement>(null);
  
  // 타이포그래피 애니메이션을 위한 상태
  const [currentLocationIndex, setCurrentLocationIndex] = useState(0);
  const locations = ["서울", "경기도", "인천", "대전", "세종", "충청북도", "충청남도", "강원도", "경상북도", "경상남도", "대구", "울산", "부산", "전라북도", "전라남도", "광주", "제주도"];
  const [textOffset, setTextOffset] = useState(0);
  const activeWordRef = useRef<HTMLSpanElement>(null);
  
  // API URL
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // 컴포넌트 마운트 시 최근 검색어 로드와 중고나라 랭킹 데이터 로드
  useEffect(() => {
    if (isAuthenticated()) {
      fetchRecentSearches();
    }
    fetchJoongnaRankings();
  }, []);

  // 현재 요일을 가져오는 함수 추가
  const getDayOfWeek = () => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const today = new Date();
    return days[today.getDay()];
  };

  // 타이포그래피 애니메이션 효과
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentLocationIndex((prevIndex) => (prevIndex + 1) % locations.length);
    }, 2000);
    
    return () => clearInterval(interval);
  }, [locations.length]);

  // 활성화된 단어의 길이에 따라 위치 조정
  useEffect(() => {
    const updateOffset = () => {
      if (activeWordRef.current) {
        const activeWordWidth = activeWordRef.current.offsetWidth;
        setTextOffset(activeWordWidth);
      }
    };
    
    // 애니메이션 시작 후 약간의 딜레이 후 오프셋 계산 (트랜지션이 완료된 후)
    const timeoutId = setTimeout(() => {
      updateOffset();
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [currentLocationIndex]);

  // 중고나라 인기 검색어 가져오기
  const fetchJoongnaRankings = async () => {
    setLoadingJoongna(true);
    try {
      const url = `${apiUrl}/api/trend/joongna-rankings`;
      const response = await axios.get(url);
      console.log('중고나라 인기 검색어 응답:', response.data);
      
      if (response.data && response.data.rankings) {
        setJoongnaRankings(response.data.rankings);
      }
    } catch (error) {
      console.error('중고나라 인기 검색어 가져오기 실패:', error);
      
      // 임시 데이터 (서버 오류 발생 시)
      setJoongnaRankings([
        { rank: 1, keyword: "아이폰15" },
        { rank: 2, keyword: "맥북프로" },
        { rank: 3, keyword: "에어팟" },
        { rank: 4, keyword: "자전거" },
        { rank: 5, keyword: "닌텐도 스위치" },
        { rank: 6, keyword: "아이패드" },
        { rank: 7, keyword: "캠핑용품" },
        { rank: 8, keyword: "노트북" },
        { rank: 9, keyword: "루이비통" },
        { rank: 10, keyword: "냉장고" }
      ]);
    } finally {
      setLoadingJoongna(false);
    }
  };

  // 최근 검색 이력 가져오기
  const fetchRecentSearches = async (): Promise<RecentSearch[]> => {
    // 로딩 상태 설정
    setLoadingRecent(true);
    
    // 인증 상태 확인
    const authenticated = isAuthenticated();
    
    try {
      // API 요청 설정
      const config: {
        headers: {
          'Content-Type': string;
          Authorization?: string;
        };
        params: {
          limit: number;
        };
      } = {
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
      setRecentSearches([]);
      return [];
    } finally {
      setLoadingRecent(false);
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
    
    setVisibleTagsCount(visibleCount);
  }, [recentSearches.length, showAllRecentSearches]);

  // 최근 검색어 목록이 변경될 때만 펼치기 상태 초기화
  useEffect(() => {
    // 펼쳐진 상태 초기화
    setShowAllRecentSearches(false);
    // 콘텐츠가 실제로 렌더링된 후 계산 수행
    setTimeout(() => {
      calculateVisibleTags();
    }, 100);
  }, [recentSearches.length]); // calculateVisibleTags를 의존성에서 제거

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

  // 검색 핸들러 수정
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      // 키워드 클릭과 동일한 로직 적용
      checkExistingResultsAndNavigate(searchTerm);
    }
  };

  // 랭킹 스타일 계산 함수 추가
  const getRankStyle = (rank: number) => {
    switch(rank) {
      case 1:
        return {
          background: 'linear-gradient(135deg, #FFF176 0%, #FFD54F 100%)',
          borderColor: '#FFB300',
          color: '#FF6F00',
          boxShadow: '0 3px 8px rgba(255, 193, 7, 0.3)',
          fontWeight: 600
        };
      case 2:
        return {
          background: 'linear-gradient(135deg, #E0E0E0 0%, #BDBDBD 100%)',
          borderColor: '#9E9E9E',
          color: '#424242',
          boxShadow: '0 2px 6px rgba(158, 158, 158, 0.3)',
          fontWeight: 600
        };
      case 3:
        return {
          background: 'linear-gradient(135deg, #FFAB91 0%, #FF8A65 100%)',
          borderColor: '#E64A19',
          color: '#BF360C',
          boxShadow: '0 2px 5px rgba(255, 138, 101, 0.3)',
          fontWeight: 600
        };
      default:
        return {
          backgroundColor: '#f5f5f5',
          borderColor: '#e0e0e0',
          transition: 'all 0.2s ease'
        };
    }
  };

  // 랭킹 아이콘 가져오기 함수 수정
  const getRankIcon = (rank: number) => {
    switch(rank) {
      case 1:
        return <i className="fas fa-fire"></i>;
      case 2:
        return <i className="fas fa-fire"></i>;
      case 3:
        return <i className="fas fa-fire"></i>;
      default:
        return null;
    }
  };

  // 검색어의 최근 검색 시간 조회 함수 추가
  const fetchLatestSearchTime = async (query: string): Promise<LatestSearchTime | null> => {
    try {
      const token = localStorage.getItem('token');
      const headers: {[key: string]: string} = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const response = await axios.get(`${apiUrl}/api/search/latest-time`, {
        headers,
        params: { query }
      });
      
      console.log('검색어 최근 시간 조회 응답:', response.data);
      return response.data;
    } catch (error) {
      console.error('검색어 최근 시간 조회 실패:', error);
      return null;
    }
  };
  
  // 기존 검색 결과가 있는지 확인하고 적절한 페이지로 이동하는 함수
  const checkExistingResultsAndNavigate = async (keyword: string) => {
    try {
      // 해당 검색어의 최근 검색 시간 조회
      const latestTime = await fetchLatestSearchTime(keyword);
      
      // 검색 결과가 있는 경우 use_existing=true 파라미터 추가
      if (latestTime && latestTime.has_results && latestTime.latest_time) {
        console.log(`"${keyword}" 검색어에 대한 기존 결과가 있어 use_existing=true로 검색 페이지로 이동합니다`);
        navigate(`/search?q=${encodeURIComponent(keyword)}&use_existing=true`);
      } else {
        // 검색 결과가 없는 경우 일반 검색으로 이동
        console.log(`"${keyword}" 검색어에 대한 기존 결과가 없어 일반 검색 페이지로 이동합니다`);
        navigate(`/search?q=${encodeURIComponent(keyword)}`);
      }
    } catch (error) {
      console.error('검색 결과 확인 중 오류 발생:', error);
      // 오류 발생 시 기본적으로 그냥 검색 페이지로 이동
      navigate(`/search?q=${encodeURIComponent(keyword)}`);
    }
  };

  // 키워드 클릭 핸들러 수정
  const handleKeywordClick = (keyword: string) => {
    setSearchTerm(keyword);
    checkExistingResultsAndNavigate(keyword);
  };

  // 최근 검색어 클릭 핸들러 - 키워드 클릭과 동일한 로직으로 수정
  const handleRecentSearchClick = (query: string) => {
    checkExistingResultsAndNavigate(query);
  };

  // 시간 형식 변환 (예: x분전, x시간전, x일전, x달전)
  const formatTimeAgo = (dateString: string) => {
    if (!dateString) return '알 수 없음';
    
    try {
      const now = new Date();
      const date = new Date(dateString);
      const diffMs = now.getTime() - date.getTime();
      
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return '방금 전';
      
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}분 전`;
      
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour}시간 전`;
      
      const diffDay = Math.floor(diffHour / 24);
      if (diffDay < 30) return `${diffDay}일 전`;
      
      const diffMonth = Math.floor(diffDay / 30);
      if (diffMonth < 12) return `${diffMonth}달 전`;
      
      const diffYear = Math.floor(diffMonth / 12);
      return `${diffYear}년 전`;
    } catch (e) {
      return '알 수 없음';
    }
  };

  return (
    <div className="trend-page">
      {/* 검색창 */}
      <div className="section search-container">
        <div className="container" style={{maxWidth: '640px'}}>
          {/* 타이포그래피 애니메이션 섹션 */}
          <div className="typography-section">
            <h2 className="typography-title has-text-centered">
              <span className="location-icon" style={{ transform: `translateX(-1px)` }}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" data-seed-icon="true" data-seed-icon-version="0.0.10" width="100%" height="100%">
                  <g>
                    <path d="M12.0022 0.498047C6.10466 0.498047 2.06836 4.96307 2.06836 10.4215C2.06836 14.28 4.55706 17.553 6.82617 19.7593C7.98687 20.8782 9.1371 21.7775 10.005 22.3944C10.4679 22.7331 10.9513 23.0575 11.448 23.346C11.7722 23.5342 12.2218 23.5551 12.546 23.3669C13.0436 23.078 13.5163 22.7313 13.989 22.4049C14.8569 21.7879 16.0072 20.8887 17.1679 19.7698C19.437 17.5634 21.9257 14.3009 21.9257 10.4319C21.9361 4.96307 17.8998 0.498047 12.0022 0.498047ZM12.0022 14.4787C9.76451 14.4787 7.94504 12.6592 7.94504 10.4215C7.94504 8.18374 9.76451 6.36427 12.0022 6.36427C14.24 6.36427 16.0595 8.18374 16.0595 10.4215C16.0595 12.6592 14.24 14.4787 12.0022 14.4787Z" fill="currentColor"></path>
                  </g>
                </svg>
              </span>
              <span className="typography-text">
                <span className="rotating-word-container" style={{ width: `${textOffset}px` }}>
                  {locations.map((location, index) => (
                    <span 
                      key={location} 
                      ref={index === currentLocationIndex ? activeWordRef : null}
                      className={`rotating-word ${index === currentLocationIndex ? "is-active" : ""}`}
                    >
                      {location}
                    </span>
                  ))}
                </span>
                <span className="static-text" style={{ marginLeft: '7px' }}> 전지역 한번에 검색하세요</span>
              </span>
            </h2>
          </div>
          
          <form onSubmit={handleSearch} className="search-form mb-0">
            <div className="field">
              <div className="control has-icons-left">
   
                <div className="search-location-divider"></div>
                <input
                  type="text"
                  className="input search-input"
                  placeholder="검색어를 입력해주세요"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                
                <button 
                  className="search-icon-button"
                  type="submit"
                  aria-label="검색"
                >
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" data-seed-icon="true" data-seed-icon-version="0.0.10" width="16" height="16">
                    <g>
                      <path fill-rule="evenodd" clip-rule="evenodd" d="M11.6507 2.15225C11.1821 2.62088 11.1821 3.38068 11.6507 3.84931L18.1022 10.3008H2.99922C2.33648 10.3008 1.79922 10.8381 1.79922 11.5008C1.79922 12.1635 2.33648 12.7008 2.99922 12.7008H18.1022L11.6507 19.1523C11.1821 19.6209 11.1821 20.3807 11.6507 20.8493C12.1193 21.3179 12.8791 21.3179 13.3477 20.8493L21.8477 12.3493C22.0728 12.1243 22.1992 11.8191 22.1992 11.5008C22.1992 11.1825 22.0728 10.8773 21.8477 10.6523L13.3477 2.15225C12.8791 1.68362 12.1193 1.68362 11.6507 2.15225Z" fill="#ffffff"></path>
                    </g>
                  </svg>
                </button>
                
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
                  <button type="button" className="search-clear-button" onClick={() => setSearchTerm('')}>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" data-seed-icon="true" data-seed-icon-version="0.0.10" width="18" height="18">
                        <g>
                          <path fill-rule="evenodd" clip-rule="evenodd" d="M0.800781 11.9998C0.800781 5.81706 5.81804 0.799805 12.0008 0.799805C18.1835 0.799805 23.2008 5.81706 23.2008 11.9998C23.2008 18.1825 18.1835 23.1998 12.0008 23.1998C5.81804 23.1998 0.800781 18.1825 0.800781 11.9998ZM8.46537 8.46574C8.8559 8.07522 9.48906 8.07522 9.87959 8.46574L12.0006 10.5868L14.1216 8.46574C14.5121 8.07522 15.1453 8.07522 15.5358 8.46574C15.9264 8.85627 15.9264 9.48943 15.5358 9.87996L13.4148 12.001L15.5364 14.1226C15.927 14.5131 15.927 15.1463 15.5364 15.5368C15.1459 15.9273 14.5128 15.9273 14.1222 15.5368L12.0006 13.4152L9.87898 15.5368C9.48846 15.9273 8.85529 15.9273 8.46477 15.5368C8.07424 15.1463 8.07424 14.5131 8.46477 14.1226L10.5864 12.001L8.46537 9.87996C8.07485 9.48943 8.07485 8.85627 8.46537 8.46574Z" fill="#b0b3ba"></path>
                        </g>
                      </svg>
                  </button>
                  
                )}
              </div>
            </div>
          </form>
          
          {/* 최근 검색어 */}
          {isAuthenticated() && recentSearches.length > 0 && (
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
                        onClick={() => handleRecentSearchClick(search.query)}
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
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* 중고나라 인기 검색어 섹션 */}
      <section className="section joongna-trend-section">
        <div className="container">
          <div className="joongna-trend-container">
            <div className="trend-box">
              <h3 className="trend-title">
                <span className="icon-text trend-title-animation">
                  <span className="icon">
                    <i className="fas fa-fire-alt"></i>
                  </span>
                  <span className="trend-day-text">
                    <span className="day-highlight">{getDayOfWeek()}요일</span> 중고거래 트렌드
                  </span>
                </span>
                {loadingJoongna && (
                  <span className="is-size-6 has-text-grey ml-2">
                    <i className="fas fa-spinner fa-spin"></i> 업데이트 중...
                  </span>
                )}
              </h3>
              
              {loadingJoongna && joongnaRankings.length === 0 ? (
                <div className="loading-container">
                  <div className="spinner-container">
                    <div className="spinner"></div>
                  </div>
                  <p className="loading-text">인기 검색어를 불러오고 있습니다</p>
                </div>
              ) : (
                <div className="joongna-keywords-grid">
                  {joongnaRankings.map((keyword, index) => (
                    <div 
                      key={`joongna-${keyword.rank}-${index}`} 
                      className={`keyword-card rank-${keyword.rank <= 3 ? keyword.rank : 'default'}`}
                      onClick={() => handleKeywordClick(keyword.keyword)}
                      data-tooltip={`${keyword.rank}위`}
                    >
                      {keyword.rank <= 3 && (
                        <div className="rank-icon">
                          {getRankIcon(keyword.rank)}
                        </div>
                      )}
                      <span className="keyword-text">{keyword.keyword}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Trend;