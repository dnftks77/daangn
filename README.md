# Supabase 데이터베이스 탐색기

이 스크립트는 Supabase 데이터베이스의 모든 테이블 구조와 각 테이블의 레코드를 최대 10개까지 조회하는 도구입니다.

## 설치 방법

1. 필요한 패키지 설치:
```bash
pip install -r requirements.txt
```

2. 환경 변수 확인:
frontend/.env 파일에 다음 정보가 포함되어 있는지 확인하세요:
```
VITE_SUPABASE_URL=https://your-supabase-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 실행 방법

```bash
python supabase_explorer.py
```

## 환경 설정

### 로깅 설정
- 로깅 레벨은 환경 변수 `ENV`에 따라 자동으로 설정됩니다.
- 개발 환경(`ENV=development`): 모든 로그가 출력됩니다. (DEBUG 레벨)
- 프로덕션 환경(`ENV=production`): 경고 및 오류 로그만 출력됩니다. (WARNING 레벨)

```bash
# 개발 환경 (기본값)
export ENV=development

# 프로덕션 환경
export ENV=production
```

### 도커 환경 설정

#### 개발 환경 (로컬)
개발 환경에서는 모든 디버그 로그를 출력합니다:

```bash
# 개발 환경에서 실행
docker-compose up
```

#### 프로덕션 환경
프로덕션 환경에서는 경고 및 오류 로그만 출력합니다:

```bash
# 프로덕션 환경에서 실행
docker-compose -f docker-compose.prod.yml up -d
```

## 출력 결과

스크립트를 실행하면 다음과 같은 정보가 표시됩니다:

1. 발견된 테이블 수
2. 각 테이블의 구조 (컬럼명, 데이터 타입, NULL 허용 여부)
3. 각 테이블의 레코드 (최대 10개) 