import { useState, useEffect } from 'react';
import axios from 'axios';
import { checkAdminStatus, isAuthenticated } from '../services/auth';

const API_URL = import.meta.env.VITE_API_URL;

interface User {
  id: string;
  username: string;
  created_at: string;
  last_sign_in_at: string | null;
}

function Admin() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    // 세션 체크 및 관리자 권한 확인
    const checkAdminStatusAndFetchUsers = async () => {
      try {
        if (!isAuthenticated()) {
          window.location.href = '/login';
          return;
        }
        
        // 관리자 권한 확인
        const adminResult = await checkAdminStatus();
        
        if (!adminResult.success) {
          setError('관리자 권한이 없습니다.');
          setLoading(false);
          return;
        }
        
        setIsAdmin(adminResult.data.is_admin);
        
        // 관리자인 경우 사용자 목록 조회
        if (adminResult.data.is_admin) {
          await fetchUsers();
        } else {
          setLoading(false);
        }
      } catch (error: any) {
        console.error("관리자 권한 확인 오류:", error);
        setError('인증 오류가 발생했습니다.');
        setLoading(false);
      }
    };
    
    checkAdminStatusAndFetchUsers();
  }, []);
  
  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('인증 토큰이 없습니다.');
      }
      
      const response = await axios.get(`${API_URL}/api/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setUsers(response.data);
      setLoading(false);
    } catch (error: any) {
      console.error("사용자 목록 조회 오류:", error);
      setError('사용자 목록을 가져오는데 실패했습니다.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="section">
        <div className="container">
          <div className="is-flex is-justify-content-center">
            <div className="loader"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="section">
        <div className="container">
          <div className="notification is-danger">
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="section">
        <div className="container">
          <div className="notification is-warning">
            <p>관리자 권한이 필요한 페이지입니다.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section">
      <div className="container">
        <h1 className="title">관리자 대시보드</h1>
        
        <div className="card">
          <header className="card-header">
            <p className="card-header-title">
              사용자 목록
            </p>
          </header>
          <div className="card-content">
            <div className="content">
              <table className="table is-fullwidth is-striped is-hoverable">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>아이디</th>
                    <th>가입일</th>
                    <th>마지막 로그인</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length > 0 ? (
                    users.map((user) => (
                      <tr key={user.id}>
                        <td>{user.id}</td>
                        <td>{user.username}</td>
                        <td>{new Date(user.created_at).toLocaleString()}</td>
                        <td>
                          {user.last_sign_in_at
                            ? new Date(user.last_sign_in_at).toLocaleString()
                            : '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="has-text-centered">
                        사용자가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Admin; 