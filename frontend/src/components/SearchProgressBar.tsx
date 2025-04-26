import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface SearchStatus {
  search_id: string;
  total_processes: number;  // 실제 요청된 프로세스 수
  completed_processes: number;
  failed_processes?: number;
  completion_percentage: number;
  total_items_found: number;
  is_completed: boolean;
  error_processes?: any[];
  place_params_count?: number;  // 실제 place_params의 전체 개수
}

interface SearchProgressBarProps {
  searchId: string | null;
  searchTerm: string;
  isCompleted?: boolean;
}

const SearchProgressBar: React.FC<SearchProgressBarProps> = ({ 
  searchId, 
  searchTerm, 
  isCompleted = false
}) => {
  const [searchStatus, setSearchStatus] = useState<SearchStatus | null>(null);
  const [animatedPercentage, setAnimatedPercentage] = useState<number>(0);
  const [pollingActive, setPollingActive] = useState<boolean>(false);
  const [internalCompleted, setInternalCompleted] = useState<boolean>(isCompleted);

  // isCompleted prop이 변경되면 내부 상태도 업데이트
  useEffect(() => {
    setInternalCompleted(isCompleted);
  }, [isCompleted]);

  // 검색 상태가 변경될 때 완료 여부 확인
  useEffect(() => {
    if (searchStatus && (searchStatus.is_completed || searchStatus.completion_percentage === 100)) {
      setInternalCompleted(true);
    }
  }, [searchStatus]);

  // 애니메이션 효과를 위한 state 업데이트 함수
  useEffect(() => {
    if (searchStatus && animatedPercentage < searchStatus.completion_percentage) {
      const timer = setTimeout(() => {
        // 부드러운 애니메이션을 위해 점진적으로 값을 증가
        const nextValue = Math.min(
          animatedPercentage + Math.max(1, (searchStatus.completion_percentage - animatedPercentage) / 10),
          searchStatus.completion_percentage
        );
        setAnimatedPercentage(nextValue);
        
        // 애니메이션이 정확히 100%에 도달하면 완료 상태로 설정
        if (nextValue === 100 && searchStatus.is_completed) {
          setInternalCompleted(true);
        }
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [searchStatus, animatedPercentage]);

  // 폴링 로직
  useEffect(() => {
    let interval: number | null = null;
    
    if (searchId && !internalCompleted) {
      const fetchSearchStatus = async () => {
        try {
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
          const token = localStorage.getItem('token');
          
          const config: any = {
            headers: {
              'Content-Type': 'application/json'
            }
          };
          
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
          
          const statusUrl = `${apiUrl}/api/search/status/${searchId}`;
          const response = await axios.get(statusUrl, config);
          
          if (response.data) {
            setSearchStatus(response.data);
            
            // 완료된 경우 폴링 중지 및 완료 상태로 설정
            if (response.data.is_completed || response.data.completion_percentage === 100) {
              setPollingActive(false);
              setInternalCompleted(true);
            }
          }
        } catch (error) {
          console.error('검색 상태 조회 오류:', error);
        }
      };
      
      setPollingActive(true);
      fetchSearchStatus();
      interval = window.setInterval(fetchSearchStatus, 1000); // 1초마다 폴링
    }
    
    return () => {
      if (interval !== null) {
        clearInterval(interval);
      }
    };
  }, [searchId, internalCompleted]);

  if (!searchId) return null;

  // 완료된 경우 100%로 표시
  const percentage = internalCompleted ? 100 : (animatedPercentage || 0);
  // 반올림(Math.round) 대신 내림(Math.floor) 사용
  const displayPercentage = Math.floor(percentage);
  
  const getProgressText = () => {
    if (internalCompleted || (searchStatus && searchStatus.is_completed) || percentage === 100) {
      return `"${searchTerm}" 전국검색이 완료되었습니다`;
    }
    
    if (!searchStatus) {
      return "검색이 진행 중입니다...";
    }
    
    const { completed_processes, total_items_found } = searchStatus;
    // place_params_count가 있으면 이를 사용하고, 없으면 total_processes 사용
    const totalCount = searchStatus.place_params_count || searchStatus.total_processes;
    return `검색 중 (${completed_processes}/${totalCount} 완료, ${total_items_found}개 항목 발견)`;
  };

  return (
    <div className={`notification ${internalCompleted ? 'is-success' : 'is-info'} is-light mb-4`}>
      {!internalCompleted ? (
        <div className="is-flex is-align-items-center">
          <progress 
            className="progress is-primary" 
            value={displayPercentage} 
            max="100"
            style={{ 
              flexGrow: 1, 
              marginRight: '10px',
              transition: 'value 0.3s ease'
            }}
          ></progress>
          <span className="has-text-weight-bold">{displayPercentage}%</span>
        </div>
      ) : null}
      <p className={`${internalCompleted ? 'has-text-weight-bold' : 'is-size-7 mt-1'}`}>
        {getProgressText()}
      </p>
    </div>
  );
};

export default SearchProgressBar; 