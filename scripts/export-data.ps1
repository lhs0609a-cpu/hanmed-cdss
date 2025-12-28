# ============================================
# 한의학 CDSS 데이터 포터블 내보내기
# ============================================
# 모든 데이터를 단일 JSON 파일로 내보내기

param(
    [string]$OutputPath = "$env:USERPROFILE\Documents\hanmed-cdss-export"
)

$ProjectRoot = Split-Path -Parent $PSScriptRoot

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " 한의학 CDSS 데이터 내보내기" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# 출력 디렉토리 생성
if (-not (Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$ExportFile = "$OutputPath\hanmed-cdss-export_$Timestamp.json"

# all-formulas.json 읽기
$AllFormulasPath = "$ProjectRoot\apps\web\src\data\formulas\all-formulas.json"

if (Test-Path $AllFormulasPath) {
    $Data = Get-Content $AllFormulasPath -Raw | ConvertFrom-Json

    # 통계 계산
    $TotalFormulas = $Data.Count
    $TotalCases = ($Data | ForEach-Object { $_.cases.Count } | Measure-Object -Sum).Sum
    $TotalHerbs = ($Data | ForEach-Object { $_.composition.Count } | Measure-Object -Sum).Sum

    # 메타데이터 추가
    $Export = @{
        meta = @{
            exportDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            version = "1.0"
            source = "hanmed-cdss"
            statistics = @{
                totalFormulas = $TotalFormulas
                totalCases = $TotalCases
                totalHerbEntries = $TotalHerbs
            }
        }
        formulas = $Data
    }

    $Export | ConvertTo-Json -Depth 100 | Out-File $ExportFile -Encoding UTF8

    Write-Host "[완료] 데이터 내보내기 성공!" -ForegroundColor Green
    Write-Host ""
    Write-Host "파일: $ExportFile" -ForegroundColor Gray
    Write-Host ""
    Write-Host "통계:" -ForegroundColor Cyan
    Write-Host "  - 처방 수: $TotalFormulas" -ForegroundColor Gray
    Write-Host "  - 치험례 수: $TotalCases" -ForegroundColor Gray
    Write-Host "  - 약재 항목 수: $TotalHerbs" -ForegroundColor Gray
    Write-Host ""

    # 파일 크기 표시
    $FileSize = (Get-Item $ExportFile).Length / 1MB
    Write-Host "파일 크기: $([math]::Round($FileSize, 2)) MB" -ForegroundColor Gray

} else {
    Write-Host "[오류] all-formulas.json을 찾을 수 없습니다" -ForegroundColor Red
    Write-Host "경로: $AllFormulasPath" -ForegroundColor Gray
}
