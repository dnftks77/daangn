from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import os
from dotenv import load_dotenv
from typing import Dict, Any
from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import JWTError, jwt
import uuid
from pydantic import BaseModel

# auth_utils에서 verify_token 함수를 임포트
from auth_utils import verify_token
from services.db_service import DBService, User

# 환경변수 로드
load_dotenv()

# JWT 설정
JWT_SECRET = os.getenv("JWT_SECRET")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7일

# 비밀번호 암호화
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/token")
db_service = DBService()

# 사용자 등록 요청 모델
class UserRegister(BaseModel):
    username: str
    password: str

# 암호화 및 검증 함수
def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# JWT 토큰 생성
def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)
    return encoded_jwt

# 사용자 인증
async def authenticate_user(username: str, password: str):
    session = db_service.get_session()
    try:
        user = session.query(User).filter(User.username == username).first()
        if not user:
            return False
        if not verify_password(password, user.password):
            return False
        
        # 로그인 시간 업데이트
        user.last_sign_in_at = datetime.now()
        session.commit()
        
        # user 객체를 세션에서 분리되지 않은 상태로 반환하기 위해 객체 복사
        user_info = {
            "id": user.id,
            "username": user.username,
            "created_at": user.created_at,
            "last_sign_in_at": user.last_sign_in_at,
            "is_admin": user.is_admin
        }
        
        return user_info
    except Exception as e:
        session.rollback()
        raise e
    finally:
        db_service.close_session()

# 로그인 엔드포인트
@router.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token_data = {
        "sub": str(user["id"]),
        "username": user["username"],
        "is_admin": user.get("is_admin", False)
    }
    
    # JWT 토큰 생성
    access_token = jwt.encode(
        {**token_data, "exp": datetime.utcnow() + timedelta(minutes=int(ACCESS_TOKEN_EXPIRE_MINUTES))},
        JWT_SECRET,
        algorithm=ALGORITHM
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user["username"],
        "is_admin": user.get("is_admin", False)
    }

# 사용자 등록 엔드포인트
@router.post("/register")
async def register(user_data: UserRegister):
    session = db_service.get_session()
    try:
        # 이미 존재하는 아이디인지 확인
        existing_user = session.query(User).filter(User.username == user_data.username).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="이미 등록된 아이디입니다"
            )
        
        # 비밀번호 해시 및 사용자 생성
        hashed_password = get_password_hash(user_data.password)
        new_user = User(
            username=user_data.username,
            password=hashed_password,
            created_at=datetime.now()
        )
        
        session.add(new_user)
        session.commit()
        session.refresh(new_user)
        
        return {"message": "회원가입이 완료되었습니다.", "user_id": str(new_user.id)}
    except HTTPException:
        session.rollback()
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"회원가입 중 오류가 발생했습니다: {str(e)}"
        )
    finally:
        db_service.close_session()

# 관리자 권한 체크 엔드포인트
@router.get("/check-admin")
async def check_admin_status(user_data: Dict[str, Any] = Depends(verify_token)):
    # 사용자 데이터에서 관리자 여부 확인
    is_admin = user_data.get("is_admin", False)
    return {"is_admin": is_admin}

# 로그인 상태 확인 엔드포인트
@router.get("/me")
async def get_current_user(user_data: Dict[str, Any] = Depends(verify_token)):
    return user_data 