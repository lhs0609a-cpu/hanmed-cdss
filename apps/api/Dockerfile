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

# 배포된 커밋(GIT_SHA)은 여기서 굽지 않는다.
#
# 이미지에 심으려고 --build-arg 를 붙였다가 배포가 통째로 안 올라간 적이 있다.
# 지금은 fly.toml 의 [env] 에 배포 시점에 찍어 넣는다 — 런타임 환경변수라
# 빌드에 영향을 주지 않고, 실패해도 배포가 아니라 확인 단계만 깨진다.
#
# 예전에 남아 있던 `ARG GIT_SHA=unknown` 은 지웠다. 값을 넘기는 쪽이 없어서
# 리터럴 "unknown" 이 이미지에 박혔고, /health 가 그걸 진짜 값인 양 돌려주고
# 있었다. 모른다고 말하는 것보다 틀린 값을 자신 있게 말하는 쪽이 나쁘다.

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
