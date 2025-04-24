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

## 출력 결과

스크립트를 실행하면 다음과 같은 정보가 표시됩니다:

1. 발견된 테이블 수
2. 각 테이블의 구조 (컬럼명, 데이터 타입, NULL 허용 여부)
3. 각 테이블의 레코드 (최대 10개) 