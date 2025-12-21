# 온고지신 AI - 한의학 임상 의사결정 지원 시스템

이종대 선생님의 6,000건 치험례 데이터를 AI로 활용하는 한의학 CDSS (Clinical Decision Support System)

## 기술 스택

### Frontend
- React 18 + TypeScript
- Vite
- Tailwind CSS + shadcn/ui
- Zustand (상태관리)
- TanStack Query (서버 상태)

### Backend
- NestJS (REST/GraphQL API)
- FastAPI (AI/ML Pipeline)
- PostgreSQL + TypeORM
- Redis (캐시)

### AI/ML
- Claude API (Anthropic)
- OpenAI Embedding
- Pinecone (Vector DB)
- LangChain

## 프로젝트 구조

```
hanmed-cdss/
├── apps/
│   ├── web/              # React 프론트엔드
│   ├── api/              # NestJS 백엔드
│   └── ai-engine/        # FastAPI AI 서비스
├── packages/
│   └── shared-types/     # 공유 타입
├── tools/
│   └── data-pipeline/    # HWP → DB 파이프라인
└── infra/
    └── docker/           # Docker 설정
```

## 시작하기

### 필수 조건
- Node.js 20+
- Python 3.11+
- Docker & Docker Compose
- pnpm 8+

### 설치

```bash
# 1. 저장소 클론
git clone <repository-url>
cd hanmed-cdss

# 2. 의존성 설치
pnpm install

# 3. 환경 변수 설정
cp .env.example .env
# .env 파일에 API 키 입력

# 4. Docker 컨테이너 시작 (PostgreSQL, Redis)
pnpm docker:up

# 5. 개발 서버 시작
pnpm dev
```

### 접속 URL
- Frontend: http://localhost:3000
- NestJS API: http://localhost:3001
- FastAPI AI Engine: http://localhost:8000
- API 문서 (NestJS): http://localhost:3001/api/docs
- API 문서 (FastAPI): http://localhost:8000/docs

## 개발 스크립트

```bash
# 전체 개발 서버 실행
pnpm dev

# 개별 서비스 실행
pnpm dev:web      # React 프론트엔드
pnpm dev:api      # NestJS 백엔드
pnpm dev:ai       # FastAPI AI Engine

# Docker
pnpm docker:up    # 컨테이너 시작
pnpm docker:down  # 컨테이너 종료
pnpm docker:logs  # 로그 확인

# 데이터베이스
pnpm db:migrate   # 마이그레이션 실행
pnpm db:seed      # 시드 데이터 삽입
```

## 환경 변수

| 변수 | 설명 | 필수 |
|------|------|------|
| DATABASE_URL | PostgreSQL 연결 URL | O |
| REDIS_URL | Redis 연결 URL | O |
| JWT_SECRET | JWT 시크릿 키 | O |
| OPENAI_API_KEY | OpenAI API 키 (임베딩) | O |
| ANTHROPIC_API_KEY | Claude API 키 | O |
| PINECONE_API_KEY | Pinecone API 키 | O |
| STRIPE_SECRET_KEY | Stripe 시크릿 키 | - |

## 라이선스

All Rights Reserved
