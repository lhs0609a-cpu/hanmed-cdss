# ============================================
# 한의학 CDSS 데이터 백업 스크립트
# ============================================

param(
    [string]$BackupPath = "$env:USERPROFILE\Documents\hanmed-cdss-backup",
    [switch]$IncludeTimestamp = $true
)

$ProjectRoot = Split-Path -Parent $PSScriptRoot

# 백업할 데이터 경로들
$DataPaths = @(
    "apps\web\src\data\formulas",
    "apps\ai-engine\data",
    "docs"
)

# 타임스탬프 생성
$Timestamp = if ($IncludeTimestamp) { Get-Date -Format "yyyyMMdd_HHmmss" } else { "" }
$BackupDir = if ($Timestamp) { "$BackupPath\backup_$Timestamp" } else { $BackupPath }

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " 한의학 CDSS 데이터 백업" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "프로젝트 경로: $ProjectRoot" -ForegroundColor Gray
Write-Host "백업 경로: $BackupDir" -ForegroundColor Gray
Write-Host ""

# 백업 디렉토리 생성
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    Write-Host "[생성] 백업 디렉토리 생성됨" -ForegroundColor Green
}

# 각 데이터 경로 백업
foreach ($DataPath in $DataPaths) {
    $SourcePath = Join-Path $ProjectRoot $DataPath
    $DestPath = Join-Path $BackupDir $DataPath

    if (Test-Path $SourcePath) {
        $DestDir = Split-Path -Parent $DestPath
        if (-not (Test-Path $DestDir)) {
            New-Item -ItemType Directory -Path $DestDir -Force | Out-Null
        }

        Copy-Item -Path $SourcePath -Destination $DestDir -Recurse -Force

        $FileCount = (Get-ChildItem -Path $SourcePath -File -Recurse).Count
        Write-Host "[복사] $DataPath ($FileCount 파일)" -ForegroundColor Green
    } else {
        Write-Host "[건너뜀] $DataPath (존재하지 않음)" -ForegroundColor Yellow
    }
}

# 백업 정보 파일 생성
$BackupInfo = @{
    timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    source = $ProjectRoot
    paths = $DataPaths
    formulas_count = (Get-Content "$ProjectRoot\apps\web\src\data\formulas\all-formulas.json" | ConvertFrom-Json).Count
}

$BackupInfo | ConvertTo-Json | Out-File "$BackupDir\backup-info.json" -Encoding UTF8

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host " 백업 완료!" -ForegroundColor Green
Write-Host " 위치: $BackupDir" -ForegroundColor Gray
Write-Host " 처방 수: $($BackupInfo.formulas_count)개" -ForegroundColor Gray
Write-Host "============================================" -ForegroundColor Green
