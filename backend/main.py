from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# 라우트 import
from routes import auth, users, search, trend

# 환경변수 로드
load_dotenv()

# 환경 설정
ENV = os.getenv("ENV", "development")

# DB 설정
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")
DB_NAME = os.getenv("DB_NAME", "daangn_db")
JWT_SECRET = os.getenv("JWT_SECRET")

# FastAPI 앱 생성
app = FastAPI(title="당근마켓 백엔드 API")

# CORS 설정
if ENV == "production":
    # 배포 환경 - Vercel 프론트엔드 URL
    FRONTEND_URL = os.getenv("FRONTEND_URL", "https://daangn.vercel.app")
    # Vercel 도메인 패턴 및 현재 사용 중인 도메인 추가
    allow_origins = [
        FRONTEND_URL,
        "https://daangn-mlli65rr1-ejrlaos-gmailcoms-projects.vercel.app",
        "https://daangn-vercel.app",
        "https://*.vercel.app"  # 모든 Vercel 서브도메인 허용
    ]
else:
    # 개발 환경 - 로컬 프론트엔드 URL
    allow_origins = ["http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(auth.router, prefix="/api", tags=["인증"])
app.include_router(users.router, prefix="/api", tags=["사용자"])
app.include_router(search.router)
app.include_router(trend.router)

# 루트 엔드포인트
@app.get("/")
def read_root():
    return {
        "message": "당근마켓 백엔드 API에 오신 것을 환영합니다!",
        "env": ENV,
        "cors_allowed_origins": allow_origins
    }

# 서버 상태 확인
@app.get("/health")
def health_check():
    return {"status": "healthy", "env": ENV}

if __name__ == "__main__":
    import uvicorn
    
    # 개발 환경에서만 자동 리로딩 활성화
    reload = ENV == "development"
    
    # 서버 포트 설정 (Cloud Run은 PORT 환경 변수를 사용)
    port = int(os.getenv("PORT", "8080"))
    
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=reload) 