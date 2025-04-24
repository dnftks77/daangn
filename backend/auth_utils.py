from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from typing import Optional, Dict
import logging
import os
from dotenv import load_dotenv
from services.db_service import DBService, User

# 환경변수 로드
load_dotenv()

# 로깅 설정
logger = logging.getLogger(__name__)

# JWT 설정
ALGORITHM = "HS256"

# OAuth2 설정 (토큰 URL)
# 실제 토큰은 /api/token 엔드포인트에서 발급되지만, 경로를 상대적으로 지정
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)

# JWT 시크릿 키 로드
try:
    from config import SECRET_KEY
    if not SECRET_KEY:
        raise ValueError("SECRET_KEY가 설정되지 않았습니다.")
    logger.info("JWT 시크릿 키가 성공적으로 로드되었습니다.")
except ImportError:
    logger.error("config.py 파일을 가져올 수 없습니다. SECRET_KEY가 설정되어 있는지 확인하세요.")
    # 환경 변수에서 시크릿 키 가져오기 (대체 방법)
    SECRET_KEY = os.getenv("JWT_SECRET")
    if not SECRET_KEY:
        logger.error("JWT_SECRET 환경 변수도 설정되지 않았습니다.")
        raise ValueError("JWT 시크릿 키가 설정되지 않았습니다.")
    logger.info("환경 변수에서 JWT 시크릿 키를 로드했습니다.")

# 데이터베이스 서비스
db_service = DBService()

async def verify_token(token: Optional[str] = Depends(oauth2_scheme)) -> Optional[Dict]:
    """
    JWT 토큰 검증 및 사용자 정보 추출
    
    Args:
        token: JWT 토큰
        
    Returns:
        사용자 정보가 담긴 딕셔너리 또는 None (인증되지 않은 경우)
        
    Raises:
        HTTPException: 토큰이 유효하지 않거나 만료된 경우
    """
    # 토큰이 없는 경우 None 반환 (인증 필수가 아닌 엔드포인트용)
    if not token:
        logger.info("인증 토큰이 제공되지 않았습니다. 비인증 요청으로 처리합니다.")
        return None
    
    try:
        # 토큰 검증 및 페이로드 디코딩
        logger.debug(f"토큰 검증 시도: {token[:20]}...")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # 'sub' 필드에서 사용자 ID 추출
        user_id = payload.get("sub")
        username = payload.get("username")
        is_admin = payload.get("is_admin", False)
        
        logger.info(f"토큰에서 사용자 정보 추출: ID={user_id}, 사용자명={username}, 관리자={is_admin}")
        
        # 필수 클레임 확인
        if user_id is None:
            logger.warning("토큰에 'sub' 클레임이 없습니다.")
            return None
        
        # 추가 검증: 데이터베이스에서 사용자 존재 여부 확인 (선택적)
        # 이 부분은 성능을 위해 생략할 수도 있음
        session = db_service.get_session()
        try:
            user = session.query(User).filter(User.id == user_id).first()
            if not user:
                logger.warning(f"토큰의 사용자 ID({user_id})가 데이터베이스에 존재하지 않습니다.")
                return None
            # 데이터베이스의 관리자 권한 가져오기 (토큰 정보보다 우선)
            is_admin = user.is_admin
            logger.debug(f"사용자 ID({user_id})가 데이터베이스에 존재합니다. 관리자 권한: {is_admin}")
        except Exception as e:
            logger.error(f"데이터베이스 사용자 확인 중 오류: {str(e)}")
        finally:
            db_service.close_session()
        
        # 사용자 정보 반환
        user_data = {"id": user_id, "username": username, "is_admin": is_admin}
        logger.info(f"인증 성공: 사용자 {username}(ID: {user_id}, 관리자: {is_admin})의 요청입니다.")
        return user_data
        
    except JWTError as e:
        logger.warning(f"JWT 토큰 검증 실패: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"토큰 검증 중 예상치 못한 오류 발생: {str(e)}")
        return None 