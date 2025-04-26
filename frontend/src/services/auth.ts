import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

/**
 * 사용자 로그인 함수
 */
export const login = async (username: string, password: string) => {
  try {
    const formData = new URLSearchParams();
    formData.append('username', username);  // OAuth2 형식은 username을 사용
    formData.append('password', password);

    const response = await axios.post(`${API_URL}/api/token`, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const { access_token, token_type } = response.data;
    
    // 토큰을 로컬 스토리지에 저장
    localStorage.setItem('token', access_token);
    localStorage.setItem('token_type', token_type);
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error('로그인 실패:', error);
    return { success: false, error };
  }
};

/**
 * 사용자 회원가입 함수
 */
export const register = async (username: string, password: string) => {
  try {
    const response = await axios.post(`${API_URL}/api/register`, { username, password });
    return { success: true, data: response.data };
  } catch (error) {
    console.error('회원가입 실패:', error);
    return { success: false, error };
  }
};

/**
 * 로그아웃 함수
 */
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('token_type');
  window.location.href = '/login';
};

/**
 * 현재 사용자 정보를 가져오는 함수
 */
export const getCurrentUser = async () => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      return { success: false, error: '토큰이 없습니다' };
    }
    
    const response = await axios.get(`${API_URL}/api/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error('사용자 정보 조회 실패:', error);
    return { success: false, error };
  }
};

/**
 * 관리자 권한 확인 함수
 */
export const checkAdminStatus = async () => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      return { success: false, error: '토큰이 없습니다' };
    }
    
    const response = await axios.get(`${API_URL}/api/check-admin`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    return { success: true, data: response.data };
  } catch (error) {
    console.error('관리자 권한 확인 실패:', error);
    return { success: false, error };
  }
};

/**
 * 인증 상태 확인 함수
 */
export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
}; 