FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir python-jose python-multipart==0.0.20

COPY . .

# 환경 변수 설정
ENV ENV=production
ENV PORT=8080
ENV JWT_SECRET=95d3c39a9bfb77e2d7fc00cfc99c5d9e3294b500d9baf88fc2854bf45c3033de
ENV DB_HOST=34.85.3.52
ENV DB_PORT=5432
ENV DB_USER=postgres
ENV DB_PASSWORD=Daangn2024!
ENV DB_NAME=daangn

# 포트 노출
EXPOSE 8080

# 애플리케이션 실행 명령 수정
CMD ["python", "main.py"] 