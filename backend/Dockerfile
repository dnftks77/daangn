FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir python-jose

COPY . .

# 환경 변수 설정
ENV ENV=production
ENV PORT=8080

# 포트 노출
EXPOSE 8080

# 프로덕션 환경에서는 reload 옵션 제거
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"] 