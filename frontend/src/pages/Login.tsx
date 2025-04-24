import { useState } from 'react';
import { Link } from 'react-router-dom';
import { login } from '../services/auth';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await login(username, password);

      if (!result.success) {
        throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.');
      }
      
      // 로그인 성공 시 홈페이지로 이동
      window.location.href = '/';
    } catch (error: any) {
      setError(error.message || '로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" style={{
      width: '100%',
      maxWidth: '400px',
      padding: '20px',
      boxShadow: '0 8px 24px rgba(255, 111, 15, 0.15)',
      borderRadius: '15px',
      background: 'hsl(0deg 0% 100% / 80%)',
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)'
    }}>
      <div className="has-text-centered mb-5">
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>

          <h1 className="title is-4 app-logo-title" style={{ margin: 0 }}>당근 전국검색기</h1>
        </div>
      </div>
          
      <form onSubmit={handleLogin} style={{ padding: '0 15px' }}>
        {error && (
          <div className="notification is-danger is-light">
            {error}
          </div>
        )}
        
        <div className="field">
          <label className="label">아이디</label>
          <div className="control has-icons-left">
            <input
              type="text"
              className="input"
              placeholder="아이디"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <span className="icon is-small is-left">
              <i className="fas fa-user"></i>
            </span>
          </div>
        </div>
        
        <div className="field">
          <label className="label">비밀번호</label>
          <div className="control has-icons-left">
            <input
              type="password"
              className="input"
              placeholder="비밀번호"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span className="icon is-small is-left">
              <i className="fas fa-lock"></i>
            </span>
          </div>
        </div>
        
        <div className="field mt-5">
          <button
            type="submit"
            className={`button is-fullwidth ${loading ? 'is-loading' : ''}`}
            style={{ 
              backgroundColor: '#ff6f0f', 
              color: 'white', 
              fontWeight: 'bold',
              border: 'none',
              borderRadius: '8px'
            }}
            disabled={loading}
          >
            로그인
          </button>
        </div>
        
        <div className="has-text-centered mt-4">
          <p>계정이 없으신가요? <Link to="/register" style={{ color: '#ff6f0f', fontWeight: 'bold' }}>회원가입</Link></p>
        </div>
      </form>
    </div>
  );
}

export default Login; 