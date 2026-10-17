<#
.SYNOPSIS
    Script helper otomatisasi git stage, commit, dan push untuk repositori TaskWorker Pro.
.DESCRIPTION
    Menstandarisasi alur git dengan pengecekan branch aktif, staging otomatis, dan push ke branch modern / upstream.
.EXAMPLE
    .\git-push.ps1 "feat: update task studio layout"
    .\git-push.ps1
#>

param (
    [Parameter(Position = 0)]
    [string]$Message = ""
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  TaskWorker Pro — Git Sync & Push Helper" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Cek Branch Aktif
$currentBranch = (git branch --show-current).Trim()
Write-Host "[INFO] Branch aktif saat ini: $currentBranch" -ForegroundColor Yellow

# 2. Cek Status Perubahan
$status = git status -s
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "[INFO] Tidak ada perubahan berkas yang belum di-commit. Repositori bersih." -ForegroundColor Green
    exit 0
}

Write-Host "[INFO] Berkas yang mengalami perubahan:" -ForegroundColor Yellow
$status | ForEach-Object { Write-Host "  $_" -ForegroundColor White }
Write-Host ""

# 3. Minta Pesan Commit jika tidak diberikan via argumen
if ([string]::IsNullOrWhiteSpace($Message)) {
    $timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm")
    $defaultMsg = "chore: synchronize codebase updates ($timestamp)"
    $inputMsg = Read-Host "Masukkan pesan commit [Default: $defaultMsg]"
    if ([string]::IsNullOrWhiteSpace($inputMsg)) {
        $Message = $defaultMsg
    } else {
        $Message = $inputMsg
    }
}

# 4. Stage & Commit
Write-Host "[INFO] Melakukan git add seluruh perubahan..." -ForegroundColor Yellow
git add -A

Write-Host "[INFO] Melakukan git commit dengan pesan: '$Message'..." -ForegroundColor Yellow
git commit -m "$Message"

# 5. Push ke Remote
Write-Host "[INFO] Mendorong commit ke remote repository..." -ForegroundColor Yellow

$remotes = git remote
$targetRemote = "github"
if (-not ($remotes -contains "github")) {
    $targetRemote = "origin"
}

Write-Host "[INFO] Menggunakan remote '$targetRemote' pada branch '$currentBranch'..." -ForegroundColor Yellow
git push $targetRemote $currentBranch

Write-Host ""
Write-Host "[SUKSES] Seluruh pembaruan kode berhasil di-push ke remote repository!" -ForegroundColor Green
Write-Host ""
