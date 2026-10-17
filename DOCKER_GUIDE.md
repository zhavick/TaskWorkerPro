# Panduan Resmi Docker Containerization & Deployment
## TaskWorker Pro (TrackerKerja Modern)

Panduan ini mendokumentasikan tata cara kontainerisasi, konfigurasi Docker Compose, persistent volumes, environment variables, dan pemeliharaan produksi untuk aplikasi **TaskWorker Pro**.

---

## 1. Arsitektur Kontainer

Sistem dijalankan dalam arsitektur multi-container yang terisolasi dalam satu bridge network (`tracker_network`):

```
                        [ Pengguna / Peramban ]
                                   │
               ┌───────────────────┴───────────────────┐
               ▼ (Port 3000)                           ▼ (Port 5008)
     ┌───────────────────────┐               ┌───────────────────────┐
     │  trackerkerja_frontend │               │  trackerkerja_backend │
     │   (Next.js 16 Turbo)  │──────────────▶│ (ASP.NET Core 8 API)  │
     └───────────────────────┘               └───────────────────────┘
                                                         │
                                                         ▼ (Port 5432)
                                             ┌───────────────────────┐
                                             │  trackerkerja_postgres│
                                             │   (PostgreSQL 16 DB)  │
                                             └───────────────────────┘
                                                         │
                                             ┌───────────────────────┐
                                             │   Persistent Volumes  │
                                             │ (pgdata, uploads_vol) │
                                             └───────────────────────┘
```

### Rincian Layanan Kontainer
| Layanan Kontainer | Image / Dockerfile | Port Internal | Port Eksternal | Persistent Volume |
|:---|:---|:---:|:---:|:---|
| **`postgres`** | `postgres:16-alpine` | `5432` | `5432` | `pgdata:/var/lib/postgresql/data` |
| **`backend`** | Multi-Stage .NET 8 SDK & ASP.NET Runtime | `5008` | `5008` | `backend_uploads:/app/uploads` |
| **`frontend`** | Multi-Stage Node.js 20 Alpine & Standalone Next.js | `3000` | `3000` | — |

---

## 2. Multi-Stage Build Specification

### Backend Dockerfile (`backend/src/TrackerKerja.WebApi/Dockerfile`)
1. **Build Stage (`mcr.microsoft.com/dotnet/sdk:8.0`)**:
   - Mengisolasi dependensi NuGet dan melakukan restore cache.
   - Mengompilasi assembly dalam mode Release (`-c Release -o /app/publish`).
2. **Runtime Stage (`mcr.microsoft.com/dotnet/aspnet:8.0`)**:
   - Image minimalis, aman dari eksploitasi build toolchain.
   - Binding port: `http://+:5008`.

### Frontend Dockerfile (`frontend/Dockerfile`)
1. **Dependencies Stage (`node:20-alpine`)**:
   - Instalasi paket via `npm ci`.
2. **Build Stage (`node:20-alpine`)**:
   - Injeksi build arguments `NEXT_PUBLIC_API_BASE_URL=http://localhost:5008/api`.
   - Kompilasi Turbopack static & server components.
3. **Runner Stage (`node:20-alpine`)**:
   - Menjalankan Next.js dalam mode standalone tanpa overhead dev dependencies.

---

## 3. Konfigurasi Docker Compose & Variabel Lingkungan

Berkas konfigurasi utama: [`docker-compose.yml`](file:///c:/TEMP/VSCODE/TrackerKerjaModern/docker-compose.yml)

### Variabel Lingkungan Penting
```env
# Backend Environment
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://+:5008
ConnectionStrings__DefaultConnection=Host=postgres;Port=5432;Database=trackerkerja_db;Username=tracker_admin;Password=TrackerSecurePassword2026!;Maximum Pool Size=100;Minimum Pool Size=10;
JwtSettings__SecretKey=SUPER_SECRET_KEY_FOR_TRACKER_KERJA_2026_MINIMUM_32_BYTES_STRONG!
JwtSettings__Issuer=https://api.trackerkerja.local
JwtSettings__Audience=https://app.trackerkerja.local
CorsSettings__AllowedOrigins__0=http://localhost:3000
CorsSettings__AllowedOrigins__1=http://frontend:3000

# Frontend Environment
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:5008/api
```

---

## 4. Cara Menjalankan Aplikasi

### Metode 1: Menggunakan PowerShell Script Helper (Direkomendasikan di Windows)
Tersedia helper script [`docker-run.ps1`](file:///c:/TEMP/VSCODE/TrackerKerjaModern/docker-run.ps1):

```powershell
# Menjalankan kontainer di latar belakang
.\docker-run.ps1 up

# Memeriksa status kontainer dan kesehatan koneksi database
.\docker-run.ps1 init-data

# Melihat live log kontainer
.\docker-run.ps1 logs

# Memeriksa status container dan port
.\docker-run.ps1 status

# Menghentikan kontainer
.\docker-run.ps1 down

# Merestart seluruh layanan
.\docker-run.ps1 restart
```

### Metode 2: Menggunakan Perintah Standar Docker CLI
```bash
# 1. Build dan jalankan seluruh container
docker compose up -d --build

# 2. Cek status container
docker compose ps

# 3. Pantau log backend
docker compose logs -f backend

# 4. Hentikan container
docker compose down
```

---

## 5. Prosedur Pencadangan (Backup) & Pemulihan (Restore) Database

### Pencadangan Database (Backup)
```bash
docker exec -t trackerkerja_postgres pg_dump -U tracker_admin -d trackerkerja_db -F c -b -v -f /tmp/backup_trackerkerja.dump
docker cp trackerkerja_postgres:/tmp/backup_trackerkerja.dump ./backup_$(date +%Y%m%d).dump
```

### Pemulihan Database (Restore)
```bash
docker cp ./backup_file.dump trackerkerja_postgres:/tmp/restore_target.dump
docker exec -t trackerkerja_postgres pg_restore -U tracker_admin -d trackerkerja_db -v --clean /tmp/restore_target.dump
```

---

## 6. Prosedur Shrink / Kompaksi Basis Data Pasca Operasi
Untuk memulihkan ruang penyimpanan disk pasca pembersihan data skala besar (Purge), Administrator dapat:
1. Mengakses menu **Konfigurasi > Pemeliharaan Data > Bagian 4 (Kompaksi Basis Data)** pada Frontend UI.
2. Mengeklik tombol **Jalankan Kompaksi (VACUUM)**, atau memanggil endpoint API:
   ```http
   POST /api/settings/maintenance/shrink
   Authorization: Bearer <TOKEN_ADMIN>
   ```
Sistem secara otomatis mengeksekusi instruksi `VACUUM ANALYZE` pada PostgreSQL atau `VACUUM` pada SQLite dan merekam ruang penyimpanan yang berhasil dioptimalkan.
