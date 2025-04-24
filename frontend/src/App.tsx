import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import './App.css'

// 페이지 컴포넌트 import
import Login from './pages/Login'
import Register from './pages/Register'
import Admin from './pages/Admin'
import Home from './pages/Home'
import Trend from './pages/Trend'

// 인증 서비스 import
import { getCurrentUser, logout, isAuthenticated, checkAdminStatus } from './services/auth'

// 로그인 상태 확인을 위한 컴포넌트
function PrivateRoute({ children, requireAdmin = false }: { children: React.ReactNode, requireAdmin?: boolean }) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 사용자 세션 확인
    const checkSession = async () => {
      const authenticated = isAuthenticated()
      setIsLoggedIn(authenticated)
      
      // 관리자 권한 확인
      if (authenticated && requireAdmin) {
        const adminResult = await checkAdminStatus()
        setIsAdmin(adminResult.success && adminResult.data.is_admin)
      }
      
      setLoading(false)
    }

    checkSession()
  }, [requireAdmin])

  if (loading) return <div className="is-flex is-justify-content-center my-5"><div className="loader"></div></div>
  
  if (!isLoggedIn) return <Navigate to="/login" />
  if (requireAdmin && !isAdmin) return <Navigate to="/" />
  
  return <>{children}</>
}

function App() {
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [isActive, setIsActive] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 현재 로그인한 사용자 가져오기
    const getUser = async () => {
      if (isAuthenticated()) {
        const result = await getCurrentUser()
        if (result.success) {
          setUser(result.data)
          
          // 관리자 권한 확인
          const adminResult = await checkAdminStatus()
          setIsAdmin(adminResult.success && adminResult.data.is_admin)
        }
      }
      setIsLoading(false)
    }

    getUser()
  }, [])

  // Bulma 스타일시트 적용
  useEffect(() => {
    const bulmaCSS = document.createElement('link')
    bulmaCSS.rel = 'stylesheet'
    bulmaCSS.href = 'https://cdn.jsdelivr.net/npm/bulma@0.9.4/css/bulma.min.css'
    
    document.head.appendChild(bulmaCSS)
    
    // Font Awesome 아이콘 적용
    const fontAwesome = document.createElement('link')
    fontAwesome.rel = 'stylesheet'
    fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
    
    document.head.appendChild(fontAwesome)
    
    return () => {
      document.head.removeChild(bulmaCSS)
      document.head.removeChild(fontAwesome)
    }
  }, [])

  // 햄버거 메뉴 토글
  const toggleBurger = () => {
    setIsActive(!isActive)
  }

  // 로그아웃 처리
  const handleLogout = () => {
    logout()
  }

  return (
    <Router>
      <AppContent 
        user={user} 
        isAdmin={isAdmin} 
        isActive={isActive} 
        toggleBurger={toggleBurger} 
        handleLogout={handleLogout} 
        isLoading={isLoading} 
      />
    </Router>
  )
}

// 앱 콘텐츠 컴포넌트를 분리하여 useLocation 훅을 사용할 수 있게 함
function AppContent({ 
  user, 
  isAdmin, 
  isActive, 
  toggleBurger, 
  handleLogout, 
  isLoading 
}: {
  user: any;
  isAdmin: boolean;
  isActive: boolean;
  toggleBurger: () => void;
  handleLogout: () => void;
  isLoading: boolean;
}) {
  const location = useLocation();
  const pathname = location.pathname;
  
  // 로그인 관련 페이지인지 확인
  const isAuthPage = pathname === '/login' || pathname === '/register';
  
  // 비로그인 상태의 관리자 페이지인지 확인
  const isNonAuthAdminPage = !user && pathname === '/admin';
  
  // 헤더가 표시되어야 하는지 확인
  const shouldShowHeader = !isAuthPage && !isNonAuthAdminPage;

  // 로딩 중일 때 로딩 인디케이터 표시
  if (isLoading) {
    return (
      <div className="is-flex is-justify-content-center is-align-items-center" style={{ height: "100vh" }}>
        <div className="loader"></div>
      </div>
    )
  }

  return (
    <div className={`app ${isAuthPage ? 'auth-page' : ''}`}>
      {/* 네비게이션 바 - 특정 조건에서만 표시 */}
      {shouldShowHeader && (
        <nav className="navbar" role="navigation" aria-label="main navigation">
          <div className="container is-fluid is-nono">
            <div className="navbar-brand">
              <Link to="/" className="navbar-item">
                <div style={{ position: 'relative' }}>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="66" 
                    fill="none" 
                    viewBox="0 0 203 114"
                    style={{ 
                      position: 'absolute', 
                      left: '-40px',
                      top: '50%',
                      transform: 'translateY(-50%)'
                    }}
                  >
                    <path fill="#FF6F0F" d="M29.234 36.895C13.09 36.895 0 49.695 0 65.855c0 22.327 29.318 34.175 29.234 34.143-.08.032 29.234-11.816 29.234-34.143 0-16.148-13.089-28.96-29.234-28.96Zm0 40.684A11.069 11.069 0 0 1 18.386 64.34a11.073 11.073 0 0 1 8.702-8.693A11.068 11.068 0 0 1 40.312 66.51a11.07 11.07 0 0 1-11.078 11.088v-.02Z"></path>
                    <path fill="#00A05B" d="M35.817 0c-6.823 0-11.574 4.768-12.322 10.4-9.094-2.512-16.22 4.4-16.22 12 0 5.82 3.999 10.52 9.33 12.047 4.299 1.228 12.041.312 12.041.312-.04-1.88 1.692-3.944 4.364-5.824 7.598-5.343 13.54-7.863 14.457-15.151C48.427 6.16 42.767 0 35.817 0Z"></path>
                  </svg>
                  <h1 className="title is-4 app-logo-title">당근 전국검색기</h1>
                </div>
              </Link>
  
              {isAdmin && (
              <a
                role="button"
                className={`navbar-burger ${isActive ? 'is-active' : ''}`}
                aria-label="menu"
                aria-expanded="false"
                onClick={toggleBurger}
              >
                <span aria-hidden="true"></span>
                <span aria-hidden="true"></span>
                <span aria-hidden="true"></span>
              </a>
              )}
            </div>
            {isAdmin && (
            <div className={`navbar-menu ${isActive ? 'is-active' : ''}`}>
              <div className="navbar-end">
                {user ? (
                  <>
                    {isAdmin && (
                      <Link to="/admin" className="navbar-item">
                        관리자 페이지
                      </Link>
                    )}
                    <Link to="/search" className="navbar-item">
                      검색하기
                    </Link>
                    <div className="navbar-item">
                      <span className="mr-2">{user.username}</span>
                      <button className="button is-light" onClick={handleLogout}>
                        로그아웃
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="navbar-item">
                    <div className="buttons">
                      <Link to="/register" className="button is-light">
                        회원가입
                      </Link>
                      <Link to="/login" className="button is-light">
                        로그인
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}
          </div>
        </nav>
      )}

      {/* 메인 콘텐츠 */}
      <main>
        <Routes>
          <Route path="/" element={
            isAuthenticated() ? <Trend /> : <Navigate to="/login" />
          } />
          <Route path="/search" element={
            isAuthenticated() ? <Home /> : <Navigate to="/login" />
          } />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/admin"
            element={
              <PrivateRoute requireAdmin={true}>
                <Admin />
              </PrivateRoute>
            }
          />
        </Routes>
      </main>
      
    </div>
  )
}

export default App