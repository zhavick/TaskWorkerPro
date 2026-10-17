<#
.SYNOPSIS
    Script helper otomatisasi pengelolaan kontainer Docker untuk TaskWorker Pro (TrackerKerja Modern).
.DESCRIPTION
    Menyediakan perintah singkat untuk build, start, stop, pantau log, cek status basis data, dan inisialisasi kontainer.
.EXAMPLE
    .\docker-run.ps1 up
    .\docker-run.ps1 down
    .\docker-run.ps1 logs
    .\docker-run.ps1 init-data
    .\docker-run.ps1 status
#>

param (
    [Parameter(Position = 0)]
    [ValidateSet("up", "down", "restart", "logs", "status", "init-data", "clean", "build")]
    [string]$Command = "up"
)

$ErrorActionPreference = "Stop"

function Write-Header {
    param ([string]$Text)
    Write-Host ""
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host "  TaskWorker Pro — $Text" -ForegroundColor Cyan
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host ""
}

switch ($Command) {
    "up" {
        Write-Header "Menjalankan Seluruh Kontainer (PostgreSQL + Backend + Frontend)"
        Write-Host "[INFO] Menjalankan Docker Compose dengan opsi --build di latar belakang..." -ForegroundColor Yellow
        docker compose up -d --build
        Write-Host ""
        Write-Host "[SUKSES] Seluruh kontainer berhasil dijalankan!" -ForegroundColor Green
        Write-Host "  - Frontend Web UI : http://localhost:3000" -ForegroundColor White
        Write-Host "  - Backend REST API: http://localhost:5008/swagger" -ForegroundColor White
        Write-Host "  - Database Postgres: localhost:5432 (trackerkerja_db)" -ForegroundColor White
    }

    "build" {
        Write-Header "Kompilasi Ulang Docker Images"
        docker compose build --no-cache
        Write-Host "[SUKSES] Seluruh image berhasil dikompilasi ulang." -ForegroundColor Green
    }

    "down" {
        Write-Header "Menghentikan Seluruh Kontainer"
        docker compose down
        Write-Host "[SUKSES] Seluruh kontainer telah dihentikan dengan tertib." -ForegroundColor Green
    }

    "restart" {
        Write-Header "Merestart Seluruh Layanan Kontainer"
        docker compose restart
        Write-Host "[SUKSES] Layanan berhasil direstart." -ForegroundColor Green
    }

    "logs" {
        Write-Header "Menampilkan Live Log Kontainer (Ctrl+C untuk keluar)"
        docker compose logs -f --tail=100
    }

    "status" {
        Write-Header "Status Kontainer & Port Binding"
        docker compose ps
    }

    "init-data" {
        Write-Header "Pengecekan Kesehatan Basis Data & Konektivitas Kontainer"
        Write-Host "[1/3] Memeriksa status kontainer aktif..." -ForegroundColor Yellow
        docker compose ps

        Write-Host "[2/3] Memeriksa status kesehatan PostgreSQL (pg_isready)..." -ForegroundColor Yellow
        try {
            docker exec -it trackerkerja_postgres pg_isready -U tracker_admin -d trackerkerja_db
            Write-Host "[OK] Basis data PostgreSQL siap menerima koneksi." -ForegroundColor Green
        } catch {
            Write-Host "[PERINGATAN] Kontainer trackerkerja_postgres belum berjalan atau belum siap." -ForegroundColor Red
        }

        Write-Host "[3/3] Memeriksa respons REST API Backend..." -ForegroundColor Yellow
        try {
            $resp = Invoke-RestMethod -Uri "http://localhost:5008/api/sync/health" -Method Get -TimeoutSec 5
            Write-Host "[OK] Backend REST API responsif: Status = $($resp.status)" -ForegroundColor Green
        } catch {
            Write-Host "[INFO] Backend API sedang memproses inisialisasi basis data dan migrasi." -ForegroundColor Yellow
        }
    }

    "clean" {
        Write-Header "Pembersihan Total Kontainer & Volume Basis Data"
        $confirm = Read-Host "Apakah Anda yakin ingin menghapus kontainer beserta persistent volume database? (y/N)"
        if ($confirm -eq "y" -or $confirm -eq "Y") {
            docker compose down -v
            Write-Host "[SUKSES] Kontainer dan persistent volume telah dibersihkan." -ForegroundColor Green
        } else {
            Write-Host "[BATAL] Operasi dibatalkan." -ForegroundColor Yellow
        }
    }
}
