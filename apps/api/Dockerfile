# 온고지신 AI - NestJS API Dockerfile
# Multi-stage build for smaller image size

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# 배포된 커밋을 앱이 스스로 말할 수 있게 심는다.
#
# 이게 없으면 배포 실패를 알아챌 방법이 없다. 새 머신이 못 떠서 Fly 가 구버전을
# 유지해도 구버전이 /health 에 200 을 돌려주므로 배포 워크플로는 초록색으로
# 끝난다. 실제로 그렇게 실패한 배포를 한참 뒤에야 발견했다.
#
# npm install 뒤에 두는 이유는 레이어 캐시다. 커밋마다 바뀌는 값이라 위쪽에
# 두면 매 배포가 의존성 설치부터 다시 한다.
ARG GIT_SHA=unknown
ENV GIT_SHA=$GIT_SHA

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

# Create backups directory with proper permissions
RUN mkdir -p /app/backups && chown nestjs:nodejs /app/backups

USER nestjs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/v1/health || exit 1

# Start the application
CMD ["node", "dist/main.js"]
