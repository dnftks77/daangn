import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { logger } from './utils/logger'

// 환경 정보 로깅
logger.info(`환경: ${import.meta.env.MODE}`)
logger.info('애플리케이션 시작')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
