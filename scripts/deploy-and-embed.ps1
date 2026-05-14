# =============================================================================
# 온고지신 — 백엔드 재배포 + 마이그레이션 + 임베딩 생성 자동화
# =============================================================================
# 실행:
#   PowerShell 새 창 열고 (관리자 권한 X)
#   cd "G:\내 드라이브\developer\hanmed-cdss"
#   .\scripts\deploy-and-embed.ps1
#
# 중간에 OpenAI 키를 묻습니다. https://platform.openai.com/api-keys 에서 발급 후 붙여넣기.
# =============================================================================

$ErrorActionPreference = "Stop"
$ApiApp = "hanmed-api"
$AiEngineApp = "hanmed-ai-engine"
$ApiConfig = "apps/api/fly.toml"
$AiEngineConfig = "apps/ai-engine/fly.toml"

function Write-Step($num, $msg) {
    Write-Host ""
    Write-Host "===============================================================" -ForegroundColor Cyan
    Write-Host "  Step $num : $msg" -ForegroundColor Cyan
    Write-Host "===============================================================" -ForegroundColor Cyan
}

function Confirm-Continue($msg) {
    Write-Host ""
    Write-Host $msg -ForegroundColor Yellow
    $reply = Read-Host "계속하려면 [Enter], 중단하려면 [Ctrl+C]"
}

# -----------------------------------------------------------------------------
# 0. 환경 점검
# -----------------------------------------------------------------------------
Write-Step 0 "환경 점검"

# flyctl 설치 확인
try {
    $flyVersion = flyctl version 2>&1
    Write-Host "✓ flyctl 설치됨: $flyVersion"
} catch {
    Write-Host "✗ flyctl 미설치 — 자동 설치합니다…" -ForegroundColor Red
    iwr https://fly.io/install.ps1 -useb | iex
    Write-Host "설치 완료. PowerShell 새 창을 열어서 이 스크립트를 다시 실행해주세요." -ForegroundColor Yellow
    exit 1
}

# 로그인 상태 확인
try {
    $whoami = fly auth whoami 2>&1
    Write-Host "✓ Fly.io 로그인: $whoami"
} catch {
    Write-Host "✗ Fly.io 로그인 필요 — 브라우저 자동 열림" -ForegroundColor Red
    fly auth login
}

# 앱 존재 확인
$apps = fly apps list 2>&1
if ($apps -notmatch $ApiApp) {
    Write-Host "✗ $ApiApp 앱을 못 찾았습니다." -ForegroundColor Red
    Write-Host "fly apps list 결과:" -ForegroundColor Yellow
    Write-Host $apps
    exit 1
}
Write-Host "✓ Fly 앱 확인 완료: $ApiApp, $AiEngineApp"

# -----------------------------------------------------------------------------
# 1. OpenAI 키 확인/설정
# -----------------------------------------------------------------------------
Write-Step 1 "OpenAI API 키 확인"

$secrets = fly secrets list -a $ApiApp 2>&1 | Out-String
if ($secrets -match "OPENAI_API_KEY") {
    Write-Host "✓ OPENAI_API_KEY 가 이미 $ApiApp 에 설정됨"
} else {
    Write-Host "✗ OPENAI_API_KEY 미설정 — 지금 입력해주세요" -ForegroundColor Yellow
    Write-Host "  발급: https://platform.openai.com/api-keys" -ForegroundColor Gray
    $key = Read-Host -AsSecureString "OPENAI_API_KEY (sk-proj-…)"
    $keyPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($key)
    )
    fly secrets set "OPENAI_API_KEY=$keyPlain" -a $ApiApp
    Write-Host "✓ 키 설정 완료 — 자동 재배포 1~2분 대기"
}

# AI Engine 에도 (있으면 좋음)
$aiSecrets = fly secrets list -a $AiEngineApp 2>&1 | Out-String
if ($aiSecrets -notmatch "OPENAI_API_KEY") {
    Write-Host "  AI Engine 에도 같은 키 설정 중…"
    if ($keyPlain) {
        fly secrets set "OPENAI_API_KEY=$keyPlain" -a $AiEngineApp
    } else {
        Write-Host "  (이미 hanmed-api 에 있던 키 사용 — AI Engine 은 별도 설정 필요시 수동으로)" -ForegroundColor Gray
    }
}

# AI_ENGINE_URL 도 확인
if ($secrets -notmatch "AI_ENGINE_URL") {
    Write-Host "  AI_ENGINE_URL 설정 중…"
    fly secrets set "AI_ENGINE_URL=https://$AiEngineApp.fly.dev" -a $ApiApp
}

# -----------------------------------------------------------------------------
# 2. 백엔드 재배포
# -----------------------------------------------------------------------------
Confirm-Continue "다음 단계: API 서버 재배포 (3~5분)"
Write-Step 2 "백엔드 재배포 (hanmed-api)"

flyctl deploy --remote-only --config $ApiConfig

Write-Host "✓ 배포 완료. 헬스체크…"
Start-Sleep -Seconds 5
try {
    $health = Invoke-RestMethod -Uri "https://api.ongojisin.co.kr/api/v1/health" -TimeoutSec 10
    Write-Host "✓ 헬스체크 OK: $($health | ConvertTo-Json -Compress)"
} catch {
    Write-Host "⚠ 헬스체크 실패 — 로그 확인: flyctl logs --config $ApiConfig" -ForegroundColor Yellow
}

# -----------------------------------------------------------------------------
# 3. DB 마이그레이션
# -----------------------------------------------------------------------------
Confirm-Continue "다음 단계: DB 마이그레이션 (embedding 컬럼 추가)"
Write-Step 3 "DB 마이그레이션"

# SSH 로 컨테이너 진입해서 마이그레이션 실행
$migrationCmd = "cd /app && pnpm migration:run"
Write-Host "컨테이너에서 실행: $migrationCmd"
fly ssh console --config $ApiConfig -C "sh -c '$migrationCmd'"

# -----------------------------------------------------------------------------
# 4. 임베딩 생성
# -----------------------------------------------------------------------------
Confirm-Continue "다음 단계: 임베딩 생성 6,454건 (~5분, ~`$0.10)"
Write-Step 4 "임베딩 생성 (먼저 5건 dry-run)"

Write-Host "먼저 5건만 시험 — DB 변경 없음"
fly ssh console --config $ApiConfig -C "sh -c 'cd /app && pnpm embed:cases --limit=5'"

Confirm-Continue "5건 결과 OK 면 전체 6,454건 진행"
Write-Step 4 "전체 임베딩 생성"

fly ssh console --config $ApiConfig -C "sh -c 'cd /app && pnpm embed:cases'"

# -----------------------------------------------------------------------------
# 5. 완료
# -----------------------------------------------------------------------------
Write-Step 5 "완료"
Write-Host ""
Write-Host "✓ 모든 단계 완료. 브라우저에서 확인:" -ForegroundColor Green
Write-Host "    https://hanmed-cdss.vercel.app/dashboard/cases"
Write-Host ""
Write-Host "  검색 모드 'AI 유사 검색' 선택 후 '감기' 입력 →"
Write-Host "  카드에 '92% 일치 | 갈근탕' 식으로 매칭 % 가 보이면 성공"
Write-Host ""
Write-Host "  치험례 본문도 정리하고 싶으면 (선택, 6~8시간, ~`$25):" -ForegroundColor Gray
Write-Host "    fly ssh console --config $ApiConfig -C `"sh -c 'cd /app && pnpm enrich:cases'`"" -ForegroundColor Gray
