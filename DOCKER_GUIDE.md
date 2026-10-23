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

---

## 7. Deploy Produksi di VPS (Nginx / aaPanel)

Gunakan `docker-compose.prod.yml`: semua port hanya di-bind ke `127.0.0.1`, secret dibaca dari `.env`, dan frontend di-build dengan `NEXT_PUBLIC_API_BASE_URL=/api` sehingga browser memanggil backend lewat domain/IP yang sama.

### 7.1 Menjalankan
```bash
git checkout modern && git pull
cp .env.example .env        # isi APP_URL, POSTGRES_PASSWORD, JWT_SECRET (openssl rand -hex 24)
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
```
> `POSTGRES_PASSWORD` hanya dipakai saat volume `pgdata` pertama kali dibuat. Jika volume lama sudah ada, password lama tetap berlaku.

### 7.2 Routing Nginx
| Path | Tujuan | Catatan |
|:---|:---|:---|
| `/` | `http://127.0.0.1:5000` | Frontend Next.js (`FRONTEND_PORT`) |
| `/api` | `http://127.0.0.1:5008` | REST API |
| `/hubs` | `http://127.0.0.1:5008` | SignalR, butuh header WebSocket |
| `/uploads` | `http://127.0.0.1:5008` | Berkas unggahan |

Di aaPanel: **Site → Reverse proxy**, buat satu proxy per baris tabel di atas (Target URL tanpa `/` di akhir, Sent Domain `$host`). Lalu di tab **Config** tambahkan di dalam blok `server { }`:
```nginx
    client_max_body_size 50m;
    # Opsional: tutup endpoint sinkronisasi jika fitur sync antar instance tidak dipakai
    if ($uri ~* "^/api/sync") { return 403; }
```
Untuk proxy `/hubs` pastikan terdapat:
```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

### 7.3 Sinkronisasi Antar Instance
Endpoint `/api/sync/*` yang bisa diakses tanpa login hanya menerima `SYNC_API_KEY` dari `.env` atau kunci di tabel `SystemSettings`. Kunci lama yang pernah ter-commit (`TK-SYNC-...` dan `TRACKERKERJA_SYNC_SECRET_DEFAULT_2026`) selalu ditolak. Kosongkan `SYNC_API_KEY` untuk menonaktifkan akses sync via API key.
