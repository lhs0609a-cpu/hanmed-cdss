# ============================================
# 한의학 CDSS 실시간 데이터 백업 (파일 감시)
# ============================================
# 사용법: .\watch-backup.ps1 -BackupPath "D:\backup"
# 백그라운드 실행: Start-Process powershell -ArgumentList "-File .\watch-backup.ps1" -WindowStyle Hidden

param(
    [string]$BackupPath = "$env:USERPROFILE\Documents\hanmed-cdss-backup\realtime"
)

$ProjectRoot = Split-Path -Parent $PSScriptRoot

# 감시할 경로들
$WatchPaths = @(
    "$ProjectRoot\apps\web\src\data\formulas",
    "$ProjectRoot\docs"
)

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " 한의학 CDSS 실시간 백업 시작" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "감시 경로:" -ForegroundColor Gray
foreach ($path in $WatchPaths) {
    Write-Host "  - $path" -ForegroundColor Gray
}
Write-Host "백업 위치: $BackupPath" -ForegroundColor Gray
Write-Host ""
Write-Host "Ctrl+C로 중지" -ForegroundColor Yellow
Write-Host ""

# 백업 디렉토리 생성
if (-not (Test-Path $BackupPath)) {
    New-Item -ItemType Directory -Path $BackupPath -Force | Out-Null
}

# 파일 변경 시 백업 함수
function Backup-ChangedFile {
    param($FullPath, $ChangeType)

    $RelativePath = $FullPath.Replace($ProjectRoot, "").TrimStart("\")
    $DestPath = Join-Path $BackupPath $RelativePath
    $DestDir = Split-Path -Parent $DestPath

    $Timestamp = Get-Date -Format "HH:mm:ss"

    if ($ChangeType -eq "Deleted") {
        Write-Host "[$Timestamp] [삭제] $RelativePath" -ForegroundColor Red
        # 삭제된 파일은 .deleted 확장자로 기록
        if (Test-Path $DestPath) {
            Rename-Item $DestPath "$DestPath.deleted_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
        }
    } else {
        if (Test-Path $FullPath) {
            if (-not (Test-Path $DestDir)) {
                New-Item -ItemType Directory -Path $DestDir -Force | Out-Null
            }
            Copy-Item -Path $FullPath -Destination $DestPath -Force
            Write-Host "[$Timestamp] [백업] $RelativePath" -ForegroundColor Green
        }
    }
}

# FileSystemWatcher 생성
$Watchers = @()

foreach ($WatchPath in $WatchPaths) {
    if (Test-Path $WatchPath) {
        $Watcher = New-Object System.IO.FileSystemWatcher
        $Watcher.Path = $WatchPath
        $Watcher.Filter = "*.*"
        $Watcher.IncludeSubdirectories = $true
        $Watcher.EnableRaisingEvents = $true

        # 이벤트 핸들러 등록
        $Action = {
            Backup-ChangedFile -FullPath $Event.SourceEventArgs.FullPath -ChangeType $Event.SourceEventArgs.ChangeType
        }

        Register-ObjectEvent $Watcher "Created" -Action $Action | Out-Null
        Register-ObjectEvent $Watcher "Changed" -Action $Action | Out-Null
        Register-ObjectEvent $Watcher "Deleted" -Action $Action | Out-Null
        Register-ObjectEvent $Watcher "Renamed" -Action $Action | Out-Null

        $Watchers += $Watcher
        Write-Host "[활성] $WatchPath" -ForegroundColor Green
    } else {
        Write-Host "[건너뜀] $WatchPath (존재하지 않음)" -ForegroundColor Yellow
    }
}

# 초기 전체 백업 수행
Write-Host ""
Write-Host "초기 전체 백업 수행 중..." -ForegroundColor Cyan

foreach ($WatchPath in $WatchPaths) {
    if (Test-Path $WatchPath) {
        $Files = Get-ChildItem -Path $WatchPath -File -Recurse
        foreach ($File in $Files) {
            Backup-ChangedFile -FullPath $File.FullName -ChangeType "Created"
        }
    }
}

Write-Host ""
Write-Host "실시간 감시 시작됨 (파일 변경 대기 중...)" -ForegroundColor Green
Write-Host ""

# 무한 대기 (Ctrl+C로 종료)
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    # 정리
    foreach ($Watcher in $Watchers) {
        $Watcher.EnableRaisingEvents = $false
        $Watcher.Dispose()
    }
    Get-EventSubscriber | Unregister-Event
    Write-Host ""
    Write-Host "실시간 백업 종료됨" -ForegroundColor Yellow
}
