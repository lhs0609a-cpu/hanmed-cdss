FROM python:3.11-slim AS builder

WORKDIR /app

# 시스템 의존성 설치 (빌드 단계에서만)
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Python 의존성 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.11-slim

WORKDIR /app

# 런타임 의존성만 복사
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# 비루트 사용자 생성
RUN groupadd -r appuser && useradd -r -g appuser -d /app appuser

# 애플리케이션 코드 복사
COPY . .

# 소유권 변경
RUN chown -R appuser:appuser /app

# 비루트 사용자로 전환
USER appuser

# 포트 노출
EXPOSE 8080

# 헬스체크
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health')" || exit 1

# 서버 실행
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
