# ============================================
# Windows 작업 스케줄러 자동 백업 설정
# ============================================
# 관리자 권한 필요
# 매 시간 자동 백업 예약

param(
    [string]$BackupPath = "$env:USERPROFILE\Documents\hanmed-cdss-backup",
    [int]$IntervalHours = 1
)

$ScriptPath = Join-Path $PSScriptRoot "backup-data.ps1"
$TaskName = "HanmedCDSS-AutoBackup"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " Windows 작업 스케줄러 백업 설정" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# 기존 작업 확인 및 삭제
$ExistingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($ExistingTask) {
    Write-Host "기존 작업 삭제 중..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# 새 작업 생성
$Action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -File `"$ScriptPath`" -BackupPath `"$BackupPath`""
$Trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Hours $IntervalHours)
$Principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType S4U -RunLevel Limited
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

try {
    Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Principal $Principal -Settings $Settings -Description "한의학 CDSS 자동 백업 (매 ${IntervalHours}시간)" | Out-Null

    Write-Host "[성공] 작업 스케줄러 등록 완료!" -ForegroundColor Green
    Write-Host ""
    Write-Host "설정 내용:" -ForegroundColor Gray
    Write-Host "  - 작업 이름: $TaskName" -ForegroundColor Gray
    Write-Host "  - 백업 주기: 매 ${IntervalHours}시간" -ForegroundColor Gray
    Write-Host "  - 백업 위치: $BackupPath" -ForegroundColor Gray
    Write-Host ""
    Write-Host "작업 스케줄러에서 확인: taskschd.msc" -ForegroundColor Yellow
} catch {
    Write-Host "[오류] 작업 스케줄러 등록 실패" -ForegroundColor Red
    Write-Host "관리자 권한으로 다시 실행해주세요" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "수동 실행: .\backup-data.ps1" -ForegroundColor Gray
}
