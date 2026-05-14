# =============================================================================
# Hanmed CDSS - Deploy + Migration + Embedding (PowerShell 5.1 compatible)
# =============================================================================
# Run:
#   cd "G:\내 드라이브\developer\hanmed-cdss"
#   powershell -ExecutionPolicy Bypass -File .\scripts\deploy-and-embed.ps1
# =============================================================================

$ErrorActionPreference = "Stop"
$ApiApp = "hanmed-api"
$AiEngineApp = "hanmed-ai-engine"
$ApiConfig = "apps/api/fly.toml"

function Step($num, $msg) {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "  Step ${num}: $msg" -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
}

function Wait-User($msg) {
    Write-Host ""
    Write-Host $msg -ForegroundColor Yellow
    Read-Host "Press Enter to continue (Ctrl+C to abort)"
}

# -----------------------------------------------------------------------------
# Step 0: environment check
# -----------------------------------------------------------------------------
Step 0 "Environment check"

$flyExists = $true
try {
    $null = & flyctl version 2>&1
} catch {
    $flyExists = $false
}

if (-not $flyExists) {
    Write-Host "flyctl not found - installing..." -ForegroundColor Red
    iwr https://fly.io/install.ps1 -useb | iex
    Write-Host "Install done. CLOSE this PowerShell window, OPEN a NEW one, then re-run." -ForegroundColor Yellow
    exit 1
}

$flyVersion = & flyctl version 2>&1
Write-Host "[OK] flyctl: $flyVersion"

try {
    $whoami = & fly auth whoami 2>&1
    Write-Host "[OK] logged in as: $whoami"
} catch {
    Write-Host "Not logged in - opening browser..." -ForegroundColor Red
    & fly auth login
}

$apps = & fly apps list 2>&1 | Out-String
if ($apps -notmatch $ApiApp) {
    Write-Host "[FAIL] app '$ApiApp' not found in your Fly account." -ForegroundColor Red
    Write-Host "fly apps list output:" -ForegroundColor Yellow
    Write-Host $apps
    exit 1
}
Write-Host "[OK] Fly apps verified: $ApiApp, $AiEngineApp"

# -----------------------------------------------------------------------------
# Step 1: OpenAI API key
# -----------------------------------------------------------------------------
Step 1 "OpenAI API key"

$secrets = & fly secrets list -a $ApiApp 2>&1 | Out-String

$keyPlain = $null
if ($secrets -match "OPENAI_API_KEY") {
    Write-Host "[OK] OPENAI_API_KEY already set on $ApiApp"
} else {
    Write-Host "[!] OPENAI_API_KEY not set - paste it now" -ForegroundColor Yellow
    Write-Host "    Get one at: https://platform.openai.com/api-keys" -ForegroundColor Gray
    $secureKey = Read-Host -AsSecureString "OPENAI_API_KEY"
    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
    $keyPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    & fly secrets set "OPENAI_API_KEY=$keyPlain" -a $ApiApp
    Write-Host "[OK] key set on $ApiApp - auto redeploy 1-2 min"
}

if ($secrets -notmatch "AI_ENGINE_URL") {
    Write-Host "Setting AI_ENGINE_URL..."
    & fly secrets set "AI_ENGINE_URL=https://$AiEngineApp.fly.dev" -a $ApiApp
}

$aiSecrets = & fly secrets list -a $AiEngineApp 2>&1 | Out-String
if (($aiSecrets -notmatch "OPENAI_API_KEY") -and $keyPlain) {
    Write-Host "Setting OPENAI_API_KEY on $AiEngineApp..."
    & fly secrets set "OPENAI_API_KEY=$keyPlain" -a $AiEngineApp
}

# -----------------------------------------------------------------------------
# Step 2: deploy
# -----------------------------------------------------------------------------
Wait-User "Next: deploy hanmed-api (3-5 min)"
Step 2 "Deploy hanmed-api"

& flyctl deploy --remote-only --config $ApiConfig

Start-Sleep -Seconds 5
try {
    $health = Invoke-RestMethod -Uri "https://api.ongojisin.co.kr/api/v1/health" -TimeoutSec 10
    Write-Host "[OK] health: $($health | ConvertTo-Json -Compress)"
} catch {
    Write-Host "[!] health check failed - inspect: flyctl logs --config $ApiConfig" -ForegroundColor Yellow
}

# -----------------------------------------------------------------------------
# Step 3: DB migration
# -----------------------------------------------------------------------------
Wait-User "Next: DB migration (add embedding column)"
Step 3 "DB migration"

# Use ; instead of && (PowerShell 5.1 cannot parse && even inside strings sometimes,
# and sh inside the container accepts ; just fine)
$migrationCmd = "cd /app; pnpm migration:run"
& fly ssh console --config $ApiConfig -C $migrationCmd

# -----------------------------------------------------------------------------
# Step 4: embed (dry-run then full)
# -----------------------------------------------------------------------------
Wait-User "Next: generate embeddings for ~6,454 cases (~5min, ~$0.10)"
Step 4 "Embed 5 cases (dry-run)"

$embedDry = "cd /app; pnpm embed:cases --limit=5"
& fly ssh console --config $ApiConfig -C $embedDry

Wait-User "5-case test OK? Continue to full embedding?"
Step 4 "Embed all cases"

$embedAll = "cd /app; pnpm embed:cases"
& fly ssh console --config $ApiConfig -C $embedAll

# -----------------------------------------------------------------------------
# Done
# -----------------------------------------------------------------------------
Step 5 "Done"
Write-Host ""
Write-Host "[OK] All steps complete." -ForegroundColor Green
Write-Host ""
Write-Host "  Verify at: https://hanmed-cdss.vercel.app/dashboard/cases"
Write-Host "  Switch search mode to 'AI 유사 검색' and type '감기'."
Write-Host "  Expect match% badges on cards (e.g. '92% 일치')."
Write-Host ""
Write-Host "  Optional next step (cleanup originalText, 6-8h, ~$25):" -ForegroundColor Gray
$enrichCmd = "cd /app; pnpm enrich:cases"
Write-Host "    fly ssh console --config $ApiConfig -C `"$enrichCmd`"" -ForegroundColor Gray
