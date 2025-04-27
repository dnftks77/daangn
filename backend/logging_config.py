import os
import logging
import logging.handlers
from pathlib import Path
from datetime import datetime

def configure_logging():
    """
    환경에 따라 로깅 설정을 구성합니다.
    프로덕션 환경에서는 WARNING 이상 레벨만 표시하고,
    개발 환경에서는 DEBUG 레벨까지 모두 표시합니다.
    """
    # 환경 변수 확인
    env = os.getenv("ENV", "development")
    
    # 로그 디렉토리 확인
    log_dir = Path("logs")
    if not log_dir.exists():
        log_dir.mkdir(exist_ok=True)
        
    # 로그 파일 경로 설정
    today = datetime.now().strftime("%Y-%m-%d")
    log_file = log_dir / f"app_{today}.log"
    
    # 기본 로거 설정
    root_logger = logging.getLogger()
    
    # 기존 핸들러 제거
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # 환경에 따른 로그 레벨 설정
    if env == "production":
        log_level = logging.WARNING
        # 프로덕션 환경에서는 파일에만 로깅
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
        root_logger.addHandler(file_handler)
    else:
        log_level = logging.DEBUG
        # 개발 환경에서는 콘솔과 파일 모두에 로깅
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
        root_logger.addHandler(console_handler)
        
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
        root_logger.addHandler(file_handler)
    
    # 로그 레벨 설정
    root_logger.setLevel(log_level)
    
    # 로깅 설정 정보 출력
    logging.info(f"로그 레벨: {logging.getLevelName(log_level)}")
    logging.info(f"로그 파일 경로: {log_file}")
    
    return root_logger 