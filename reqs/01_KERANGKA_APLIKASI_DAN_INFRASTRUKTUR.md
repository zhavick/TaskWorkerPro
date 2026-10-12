# 🏗️ FASE 1: KERANGKA APLIKASI DAN INFRASTRUKTUR
## TRACKERKERJA MODERN (WORK TRACKER PRO)

> **Spesifikasi Teknis Kerangka Proyek, Arsitektur Multi-Tier, dan Setup Kontainer**  
> **Target Framework**: .NET 8.0/9.0 Web API, Next.js 16 (React 19), PostgreSQL 16  
> **Status**: Ready for Implementation  

---

## 1. Topologi Arsitektur & Struktur Direktori

Sistem dikembangkan dengan pemisahan total antara **Backend (.NET Core Web API)**, **Database (PostgreSQL)**, dan **Frontend (Next.js)**. Di root workspace, struktur folder dirancang rapi:

```
TrackerKerjaModern/
├── backend/                       # Source code Backend .NET Core Web API
│   ├── TrackerKerja.sln           # Visual Studio Solution File
│   ├── src/
│   │   ├── TrackerKerja.Domain/          # Class Library: Entities, Enums, Interfaces
│   │   ├── TrackerKerja.Application/     # Class Library: DTOs, Services, FluentValidation
│   │   ├── TrackerKerja.Infrastructure/  # Class Library: EF Core Npgsql, MailKit, ClosedXML
│   │   └── TrackerKerja.WebApi/          # ASP.NET Core Web API Project: Controllers, Middlewares
│   └── tests/
│       └── TrackerKerja.Tests/           # Unit & Integration Tests (xUnit + FluentAssertions)
├── frontend/                      # Source code Next.js (Diadopsi & disempurnakan dari sample-web-ui)
│   ├── package.json               # Next.js 16, React 19, Tailwind CSS v4, TanStack Query
│   ├── tsconfig.json              # TypeScript Strict Mode Configuration
│   ├── tailwind.config.ts / css   # Theme tokens (Light/Dark) & TailGrids utilities
│   ├── src/
│   │   ├── app/                   # App Router: Layouts, Pages, Error & Loading boundaries
│   │   ├── components/            # Pustaka TailGrids Core UI + Modul TrackerKerja
│   │   ├── hooks/                 # Custom React Hooks (Auth, Timer, Kanban, Screen size)
│   │   ├── services/              # API Client (Axios instance, JWT interceptors)
│   │   └── types/                 # TypeScript interfaces selaras DTO Backend
├── database/                      # Skrip DDL, Migrasi SQL, & Data Seeder
│   ├── migrations/                # Migration scripts per versi
│   └── seeders/                   # Data master awal & akun Administrator default
├── documents/                     # Dokumentasi referensi asli (FSD, TSD, User Guide)
├── reqs/                          # Blueprint spesifikasi rekayasa bertahap (Folder ini)
├── sample-web-ui/                 # Rujukan aset UI Next.js asli (NextAdmin TailGrids)
└── docker-compose.yml             # Orkestrasi PostgreSQL, pgAdmin (opsional), & Backend
```

---

## 2. Kerangka Backend: .NET Core Web API (Clean Architecture)

### A. Inisialisasi Solusi & Project References
Perintah pembuatan kerangka proyek .NET Core via .NET CLI:

```bash
# 1. Buat direktori dan solution
mkdir backend
cd backend
dotnet new sln -n TrackerKerja

# 2. Buat layer-layer Clean Architecture
dotnet new classlib -o src/TrackerKerja.Domain -f net8.0
dotnet new classlib -o src/TrackerKerja.Application -f net8.0
dotnet new classlib -o src/TrackerKerja.Infrastructure -f net8.0
dotnet new webapi -o src/TrackerKerja.WebApi -f net8.0
dotnet new xunit -o tests/TrackerKerja.Tests -f net8.0

# 3. Hubungkan project ke Solution
dotnet sln add src/TrackerKerja.Domain/TrackerKerja.Domain.csproj
dotnet sln add src/TrackerKerja.Application/TrackerKerja.Application.csproj
dotnet sln add src/TrackerKerja.Infrastructure/TrackerKerja.Infrastructure.csproj
dotnet sln add src/TrackerKerja.WebApi/TrackerKerja.WebApi.csproj
dotnet sln add tests/TrackerKerja.Tests/TrackerKerja.Tests.csproj

# 4. Atur dependensi antar layer (Inversion of Control)
dotnet add src/TrackerKerja.Application/TrackerKerja.Application.csproj reference src/TrackerKerja.Domain/TrackerKerja.Domain.csproj
dotnet add src/TrackerKerja.Infrastructure/TrackerKerja.Infrastructure.csproj reference src/TrackerKerja.Application/TrackerKerja.Application.csproj
dotnet add src/TrackerKerja.WebApi/TrackerKerja.WebApi.csproj reference src/TrackerKerja.Infrastructure/TrackerKerja.Infrastructure.csproj
dotnet add src/TrackerKerja.WebApi/TrackerKerja.WebApi.csproj reference src/TrackerKerja.Application/TrackerKerja.Application.csproj
dotnet add tests/TrackerKerja.Tests/TrackerKerja.Tests.csproj reference src/TrackerKerja.WebApi/TrackerKerja.WebApi.csproj
```

### B. Paket NuGet yang Dibutuhkan

#### 1. `TrackerKerja.Application`
```bash
dotnet add src/TrackerKerja.Application package FluentValidation.DependencyInjectionExtensions --version 11.9.2
dotnet add src/TrackerKerja.Application package Mapster --version 7.4.0
dotnet add src/TrackerKerja.Application package Microsoft.Extensions.Logging.Abstractions --version 8.0.1
```

#### 2. `TrackerKerja.Infrastructure`
```bash
dotnet add src/TrackerKerja.Infrastructure package Npgsql.EntityFrameworkCore.PostgreSQL --version 8.0.4
dotnet add src/TrackerKerja.Infrastructure package Microsoft.EntityFrameworkCore.Design --version 8.0.8
dotnet add src/TrackerKerja.Infrastructure package Microsoft.AspNetCore.Identity.EntityFrameworkCore --version 8.0.8
dotnet add src/TrackerKerja.Infrastructure package ClosedXML --version 0.104.2
dotnet add src/TrackerKerja.Infrastructure package MailKit --version 4.7.1.1
dotnet add src/TrackerKerja.Infrastructure package Microsoft.AspNetCore.Authentication.JwtBearer --version 8.0.8
```

#### 3. `TrackerKerja.WebApi`
```bash
dotnet add src/TrackerKerja.WebApi package Swashbuckle.AspNetCore --version 6.7.3
dotnet add src/TrackerKerja.WebApi package Serilog.AspNetCore --version 8.0.2
dotnet add src/TrackerKerja.WebApi package Serilog.Sinks.PostgreSQL --version 8.0.1
dotnet add src/TrackerKerja.WebApi package Microsoft.AspNetCore.Cors --version 2.2.0
```

---

## 3. Kerangka Frontend: Next.js 16 (App Router)

### A. Adopsi Fondasi dari `sample-web-ui`
Frontend diadopsi langsung dari `sample-web-ui/nextjs-admin-dashboard-main` dengan struktur dependensi modern yang telah tervalidasi:
- **Next.js 16.2.x** dengan React 19.
- **Tailwind CSS v4** + `@tailwindcss/postcss` + `@tailwindcss/forms`.
- **TailGrids Core**: Kumpulan 42+ komponen modular di `src/components/tailgrids/core/`.
- **TanStack React Query v5**: Manajemen state server, invalidasi cache, dan mutasi data asinkron.
- **TanStack React Table v8**: Data grid dengan paginasi, pengurutan, dan pencarian cepat.
- **Dnd-Kit**: `@dnd-kit/react` untuk fungsionalitas drag-and-drop Kanban Board.
- **FullCalendar**: `@fullcalendar/react`, `@fullcalendar/daygrid`, `@fullcalendar/timegrid`.
- **Recharts**: `recharts` v3 untuk analitik finansial, burn rate bar, dan grafik performa tugas.
- **Sonner**: Toast notification interaktif.

### B. Inisialisasi Direktori Frontend
```bash
# Salin template dasar dari sample-web-ui ke folder frontend proyek
mkdir frontend
# Salin seluruh isi folder sample-web-ui/nextjs-admin-dashboard-main ke frontend/
# (atau gunakan template tersebut sebagai root frontend)
cd frontend
npm install
npm run dev
```

---

## 4. Infrastruktur Basis Data: PostgreSQL Docker Compose

Untuk memfasilitasi pengembangan lokal yang konsisten dan siap produksi, sediakan file `docker-compose.yml` di root proyek:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: trackerkerja_postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: trackerkerja_db
      POSTGRES_USER: tracker_admin
      POSTGRES_PASSWORD: TrackerSecurePassword2026!
      PGDATA: /var/lib/postgresql/data/pgdata
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./database/seeders:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U tracker_admin -d trackerkerja_db"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - tracker_network

  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: trackerkerja_pgadmin
    restart: unless-stopped
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@trackerkerja.local
      PGADMIN_DEFAULT_PASSWORD: AdminSecurePassword2026!
    ports:
      - "5050:80"
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - tracker_network

volumes:
  pgdata:
    driver: local

networks:
  tracker_network:
    driver: bridge
```

### Cara Menjalankan Lingkungan:
```bash
# Jalankan PostgreSQL di background
docker compose up -d postgres

# Cek status konektivitas database
docker compose ps
```

---

## 5. Ringkasan Port Layanan

| Komponen | Host Port | Internal Port | URL Akses Lokal |
| :--- | :---: | :---: | :--- |
| **Frontend Next.js** | `3000` | `3000` | `http://localhost:3000` |
| **Backend .NET Web API** | `5000` / `5001` (HTTPS) | `5000` | `http://localhost:5000/api` |
| **Swagger UI** | `5000` | `5000` | `http://localhost:5000/swagger` |
| **PostgreSQL 16** | `5432` | `5432` | `localhost:5432 (trackerkerja_db)` |
| **pgAdmin 4 (Opsional)** | `5050` | `80` | `http://localhost:5050` |
