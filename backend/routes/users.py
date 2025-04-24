from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List
import uuid

# auth_utils에서 verify_token 함수를 임포트
from auth_utils import verify_token
from services.db_service import DBService, User

router = APIRouter()
db_service = DBService()

# 모든 사용자 목록 조회 (관리자용)
@router.get("/users")
async def get_all_users(user_data: Dict[str, Any] = Depends(verify_token)) -> List[Dict[str, Any]]:
    """모든 사용자 목록을 조회합니다 (관리자용)"""
    session = db_service.get_session()
    try:
        users_query = session.query(User).all()
        
        users = []
        for user in users_query:
            users.append({
                "id": str(user.id),
                "username": user.username,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "last_sign_in_at": user.last_sign_in_at.isoformat() if user.last_sign_in_at else None
            })
        
        return users
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"사용자 목록을 가져오는데 실패했습니다: {str(e)}"
        )
    finally:
        db_service.close_session()

# 특정 사용자 정보 조회
@router.get("/users/{user_id}")
async def get_user(user_id: str, user_data: Dict[str, Any] = Depends(verify_token)):
    """특정 사용자의 정보를 조회합니다"""
    # 자신의 정보만 조회 가능하도록 체크 (또는 관리자 권한 체크)
    if user_data.get("id") != user_id:
        # 실제 구현에서는 관리자 권한 체크 필요
        pass
    
    session = db_service.get_session()
    try:
        # UUID 형식으로 변환
        try:
            user_uuid = uuid.UUID(user_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="잘못된 사용자 ID 형식입니다"
            )
        
        user = session.query(User).filter(User.id == user_uuid).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"사용자 ID {user_id}를 찾을 수 없습니다."
            )
        
        return {
            "id": str(user.id),
            "username": user.username,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "last_sign_in_at": user.last_sign_in_at.isoformat() if user.last_sign_in_at else None
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"사용자 정보 조회 중 오류가 발생했습니다: {str(e)}"
        )
    finally:
        db_service.close_session() 