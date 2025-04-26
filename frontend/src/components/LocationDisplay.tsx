import React from 'react';

interface LocationDisplayProps {
  sido?: string;
  dong?: string;
  location?: string;
  place_title_original?: string;
}

const formatSido = (sido?: string): string => {
  if (!sido) return '';
  
  const sidoMap: { [key: string]: string } = {
    '경기도': '경기',
    '경상남도': '경남',
    '경상북도': '경북',
    '전라남도': '전남',
    '전라북도': '전북',
    '충청남도': '충남',
    '충청북도': '충북',
    '광주광역시': '광주',
    '대구광역시': '대구',
    '대전광역시': '대전',
    '부산광역시': '부산',
    '서울특별시': '서울',
    '울산광역시': '울산',
    '인천광역시': '인천',
    '강원특별자치도': '강원',
    '세종특별자치시': '세종',
    '제주특별자치도': '제주',
  };

  return sidoMap[sido] || sido;
};

const LocationDisplay: React.FC<LocationDisplayProps> = ({ sido, dong, location, place_title_original }) => {
  if (place_title_original) {
    const parts = place_title_original.split(' ');
    
    if (parts.length >= 2) {
      const firstPart = formatSido(parts[0]);
      const lastPart = parts[parts.length - 1];
      
      return <span>{firstPart} {lastPart}</span>;
    }
  }
  
  if (sido && dong) {
    return <span>{formatSido(sido)} {dong}</span>;
  } else if (sido) {
    return <span>{formatSido(sido)}</span>;
  } else {
    return <span>{location || '위치 정보 없음'}</span>;
  }
};

export default LocationDisplay; 