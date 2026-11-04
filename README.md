# 🚀 Work Tracker Pro (TrackerKerja Modern)

> **Enterprise Work Task Management, Multi-Timer Timesheet Tracking, Attendance Management, Technical Documentation, Calendar Scheduling, & Team Performance Analytics Platform (v4.2 Task Re-upload Diff & In-Place Update, Task-Linked Notes Card, & Attendance Synchronization Matrix Edition)**

[![Next.js 16](https://img.shields.io/badge/Next.js-16%20TurboPack-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![ASP.NET Core 8.0](https://img.shields.io/badge/ASP.NET%20Core-8.0%20Web%20API-512BD4?logo=dotnet&logoColor=white)](https://dotnet.microsoft.com/)
[![Tests Passing](https://img.shields.io/badge/Tests-203%20Passed-brightgreen?logo=dotnet&logoColor=white)](backend/tests/TrackerKerja.Tests)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2016%20%7C%20SQLite-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![ClosedXML](https://img.shields.io/badge/ClosedXML-0.104.2-emerald?logo=microsoft-excel&logoColor=white)](https://github.com/ClosedXML/ClosedXML)
[![Docker](https://img.shields.io/badge/Docker-Multi--Container-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![REST API](https://img.shields.io/badge/REST%20API-110%2B%20Endpoints-85EA2D?logo=swagger&logoColor=black)](http://localhost:5008/swagger)
[![JWT Bearer](https://img.shields.io/badge/Auth-JWT%20Bearer-orange?logo=jsonwebtokens&logoColor=white)](http://localhost:5008/swagger)
[![Themes & Fonts](https://img.shields.io/badge/Themes%20%26%20Fonts-40%20Themes%20%7C%205%20Fonts-pink)](http://localhost:3000)
[![GitHub](https://img.shields.io/badge/GitHub-zhavick%2FTaskWorkerPro-181717?logo=github&logoColor=white)](https://github.com/zhavick/TaskWorkerPro.git)

---

## 🌟 Fitur Unggulan Sistem (v4.2 Modern)

### 📥 1. Re-upload Task Excel dengan Diff Engine & In-Place Update (Anti-Duplikasi)
- **Deteksi Perbedaan Field-by-Field (Smart Diff Tracking)**: Berkas Excel tugas yang pernah diunggah dapat diunggah kembali (file yang sama atau file revisi) tanpa menghasilkan data duplikat di sistem.
- **Pencocokan Identitas Multi-Kunci**: Tugas dicocokkan secara akurat melalui kode tugas resmi (`TK-xxxx`), tag indexing `code:xxxx`, kode asli spreadsheet, maupun kombinasi proyek dan normalisasi judul.
- **Visualisasi Pratinjau Diff & Filter Status**: Dialog import menyajikan kartu statistik (Total Baris, Tugas Baru, Diperbarui/Diff, Sama Persis, Error), tab filter status, serta pill highlight perubahan yang menunjukkan secara persis field mana yang diperbarui (Status, Progress, PIC, Tanggal, Milestone, Kendala, Solusi, Deskripsi).
- **In-Place Update Aman**: Pembaruan dilakukan langsung pada rekaman tugas yang ada (*in-place update*) dengan mempertahankan integritas `CompanyId`, riwayat sesi kerja, dan tag penanda.

### 📝 2. Kartu Catatan & Dokumentasi Terkait pada Halaman Detail/Edit Tugas (`/tasks/[id]`)
- **Kartu Dokumentasi Terintegrasi**: Pada halaman edit tugas (contoh: `/tasks/1626`), disediakan kartu khusus **"Catatan & Dokumentasi Terkait"** tepat di bawah riwayat sesi kerja.
- **Formulir Cepat (*Quick-Create Note*)**: Pengguna dapat langsung menulis catatan teknis, notula pembahasan, atau lampiran referensi yang secara otomatis tertaut (`taskId`) ke tugas yang sedang dibuka.
- **Tautan Cepat Dua Arah**: Kartu menampilkan daftar catatan yang terhubung dengan tombol pintas langsung ke `/notes?taskId=[id]`. Halaman `/notes` dilengkapi banner filter aktif interaktif dan tombol reset filter.

### 🏢 3. Multi-Company Isolation & Registrasi Berbasis Kode Perusahaan
- **Zero-Knowledge Privacy Registration (`/register`)**: Formulir registrasi tidak menampilkan daftar publik nama perusahaan untuk mencegah kebocoran informasi dan enumerasi klien. Pengguna memilih bergabung via kode perusahaan yang sudah ada (`ExistingCompanyCode`) atau mendaftarkan perusahaan baru.
- **Isolasi Data Ketat Multi-Tenant**: Seluruh kueri data (Proyek, Tugas, Timesheet, Presensi, Catatan, Anggota) secara ketat dibatasi berdasarkan `CompanyId` pengguna yang sedang login.
- **Otorisasi Penuh Administrator Sistem**: Administrator memiliki hak akses global lintas perusahaan dengan filter `companyId` pada modul Proyek, Tugas, dan Anggota Tim.

### 🔐 4. Keamanan Enterprise & Autentikasi JWT Bearer
- **JWT Bearer Token Architecture**: Otentikasi token JWT (HMAC-SHA256) dengan refresh token rotation dan validasi claims ketat.
- **Strict Swagger JWT Authorization**: Dokumentasi OpenAPI/Swagger UI di `/swagger` dilengkapi tombol modal **Authorize** untuk menguji endpoint berotentikasi Bearer JWT.
- **Brute-Force Lockout Protection**: Akun otomatis terkunci selama 30 menit jika gagal login 3x berturut-turut.

### 💼 5. Manajemen Proyek & Analitik Finansial
- **Pelacakan Keuangan Proyek (Project Financials)**: Pencatatan Pagu Anggaran (*Budget*) dan Biaya Aktual (*Actual Cost*) per proyek.
- **Indikator Visual Financial Burn Rate (%)**: Menampilkan serapan biaya secara real-time dengan kode warna dinamis: Hijau (<80%), Kuning/Amber (80-100%), dan Merah/Rose (>100% Peringatan Overbudget).
- **Alokasi Massal Tugas ke Proyek (Bulk Task Assignment)**: Modal checklist pada detail proyek untuk menugaskan sekumpulan tugas lepas ke dalam proyek dalam satu klik.

### 📊 6. Analitik Visual Distribusi Tugas Proyek & Pengurutan Hari Ini (`/tasks`)
- **Bagan Distribusi Tugas Proyek Interaktif (Stacked Bar & Donut)**: Visualisasi sebaran status tugas per proyek (Selesai, Berjalan, Belum Selesai, Terlambat) bertenaga Recharts. Mendukung toggle tampilan (Stacked Bar vs Donut) dan kemampuan interaktif **Click-to-Filter** langsung ke tabel daftar tugas di bawahnya.
- **Pengurutan Berbasis Hari Ini (Today-First Sorting)**: Secara otomatis memprioritaskan tugas yang memiliki batas waktu atau aktif hari ini pada urutan teratas (Tier 0), dilanjutkan dengan batas waktu terdekat.
- **Filter Tanggal Cepat**: Tersedia tombol chip filter cepat (`Semua Tanggal`, `Hari Ini / Sekarang`, `Minggu Ini`) serta indikator badge hijau menyala `Hari Ini` pada setiap baris tugas relevan.
- **Penyederhanaan Label**: Penyederhanaan label antarmuka menjadi **"Daftar Tugas"** yang lebih bersih dan profesional.

### ⏱️ 7. Timesheet, Multi-Timer, Floating Timer Bar & Grafik Beban Kerja
- **Pencatatan Jam Otomatis & Multi-Timer**: Menjalankan beberapa timer tugas bersamaan tanpa saling bertabrakan, terpantau langsung di bilah mengambang (*Floating Timer Bar*).
- **Grafik Batang Perbandingan Jam Kerja Anggota (`/reports`)**: Diagram batang komparatif interaktif di bagian atas halaman laporan yang menyajikan total jam kerja per anggota tim untuk mempermudah pemantauan alokasi beban kerja.
- **Input Durasi Cepat**: Tombol pintas penambahan jam kerja (+30m, +1h, +2h, +4h, Reset) langsung di formulir Task Studio.
- **Laporan Excel Timesheet Resmi (ClosedXML)**: Ekspor multi-sheet dengan rincian harian, rekapitulasi per proyek, konversi Man-Days, dan formula otomatis.

### 📅 8. Modul Presensi Terpadu & Rekonsiliasi Kehadiran Tim (`/attendance`)
- **Sinkronisasi Presensi Cerdas dari Tugas (8 Jam/Hari)**: Menghasilkan catatan kehadiran otomatis (8 jam WFO) dari tugas-tugas aktif anggota tim, melewati akhir pekan dan hari libur nasional.
- **Dukungan Tugas Aktif Berjalan**: Tugas yang masih berjalan (*In Progress*, dsb.) otomatis diperpanjang kehadirannya hingga hari ini (*today*).
- **Matriks Kehadiran Bulanan & Audit Harian Inklusif**: Penyajian matriks kehadiran staf lengkap 1..31 hari dan audit harian dengan resolusi multi-tenant yang inklusif untuk seluruh personel terdaftar (termasuk yang belum memiliki `CompanyId`), serta riwayat presensi mandiri bagi Administrator.

### 🎮 9. Standardisasi Modul Gamifikasi, 42 Master Badges Gaul & Streak
- **Standardisasi Tampilan & Navigasi Bersama**: Seluruh sub-halaman gamifikasi (`/gamification`, `/gamification/badges`, `/gamification/rewards`) mengadopsi struktur tata letak terpadu dengan header navigasi bersama (`gamification-nav.tsx`), glowing theme accents, dan 4 kartu metrik KPI standar (Total Poin, Level/Peringkat, Streak Hari, Total Lencana).
- **Koleksi 42 Master Badges Gaul**: Lencana prestasi bahasa gaul anak muda modern (*Si Paling Eksekutor*, *Kopi & Keringat*, *Jawara Timesheet*, *Pawang JSON*, *Dewa SQL*, *Sultan Check-In*, dll.) lintas 6 kategori.
- **Automated Badge Evaluation Engine**: Evaluasi otomatis metrik kerja nyata (tugas selesai, jam kerja, presensi WFO/WFH, catatan, kendala & solusi).
- **Aturan Streak & Reset 2 Hari**: Toleransi absen 2 hari berturut-turut sebelum streak di-reset ke Hari 1.
- **Milestone 30 Hari & Bonus 500 Poin**: Pengguna yang mencapai streak 30 hari berturut-turut mendapatkan bonus 500 poin dan hak mengklaim reward bulanan eksklusif.
- **Katalog Hadiah & Saldo Poin**: Penukaran poin (1 Poin = Rp 100) ke voucher pulsa/e-wallet, kopi, merchandise, dengan persetujuan Administrator.

### 📈 7. Audit Trail CRUD Line Chart & Filter Rentang Waktu (`/audit-trail`)
- **Grafik Garis Aktivitas CRUD Interaktif**: Endpoint `GET /api/audit-logs/crud-chart` memetakan seluruh aktivitas sistem ke dalam 4 kategori CRUD: Create (Hijau Emerald), Read (Biru Sky), Update (Kuning Amber), Delete (Merah Rose).
- **Filter Rentang Waktu Fleksibel**: Tombol pemilih rentang waktu interaktif (7 Hari, 14 Hari, dan 30 Hari Terakhir) disertai 4 kartu badge statistik total frekuensi operasi untuk audit keamanan real-time.

### 🎯 8. Dashboard Eksekutif & Eksklusi Cerdas Administrator (`/dashboard`)
- **Eksklusi Administrator dari Grafik Operasional**: Akun Administrator secara otomatis dikecualikan dari grafik produktivitas kerja dan distribusi tugas tim, memastikan metrik kinerja operasional tetap murni dan mencerminkan kontribusi tim pelaksana secara akurat.
- **Kartu Metrik & Widget Pengingat Check-In**: Rekapitulasi tugas aktif, jam kerja, presensi, serta spanduk pengingat streak harian terintegrasi.

### 📢 9. Modul Pengumuman Resmi & Modal Popup Terpadu
- **Pengelolaan Pengumuman oleh Administrator (`/announcements`)**: Admin mengelola pengumuman dengan status penayangan real-time, toggle switch aktif, dan live preview modal.
- **Kategori Pengumuman**: *Informasi Penting* (merah/rose urgent) dan *Pengumuman Umum* (ungu/indigo).
- **Anti-Overlap Sequencing Rule**: Dialog pengumuman tidak akan pernah bertumpuk dengan panduan pengguna atau tur spotlight.

### 🎨 10. 40 Tema Eye-Friendly & 5 Google Fonts Switcher
- **40 Tema Tampilan Dinamis**: 22 Tema Terang + 18 Tema Gelap ramah mata bertenaga CSS custom tokens.
- **Global Font Switcher**: 5 opsi Google Fonts pilihan (*Inter, Plus Jakarta Sans, Outfit, Poppins, Roboto*) instan tanpa reload halaman.
- **Tur Interaktif Layar (*Interactive Onboarding Tour*)**: 6 spotlight interaktif memandu pengguna baru.

### 🖥️ 11. Tata Letak Studio Bentang Penuh (Full-Width Responsive Studio Layout)
- **Desain Studio 12-Kolom Ergonomis**: Seluruh formulir kerja inti (Tugas, Proyek, Anggota, Catatan, Profil) mengadopsi struktur kanvas lebar (`w-full` dengan grid 8-kolom utama + 4-kolom sticky inspector).
- **Bilah Aksi Mengambang (*Sticky Bottom Action Bar*)**: Membentang penuh di bagian bawah layar memudahkan penyimpanan instan satu klik.

### 🧪 12. Paket Pengujian Mutu (QA) & E2E Test Matrix
- **Spreadsheet Pelacakan Interaktif ([`QA/Tracking_Test_Case_E2E_TrackerKerja.xlsx`](file:///c:/TEMP/VSCODE/TrackerKerjaModern/QA/Tracking_Test_Case_E2E_TrackerKerja.xlsx))**:
  - *Dashboard & Metrics*: Formula dinamis (`COUNTA`, `COUNTIF`, `% Completion`, `% Pass Rate`) dan tabel kemajuan 19 modul aplikasi.
  - *E2E Test Cases Master*: 72 skenario pengujian end-to-end terstruktur mencakup alur positif, negatif, keamanan RBAC, dan validasi data.
  - *Execution Cycles* & *Defect Log*.
- **Buku Panduan Standar QA ([`QA/README.md`](file:///c:/TEMP/VSCODE/TrackerKerjaModern/QA/README.md))**: Konvensi penamaan test case (`TC-[MODUL]-[NO]`), matriks keparahan defect, dan tata cara sign-off rilis.

### 🗄️ 13. Pemeliharaan Basis Data & Kompaksi Ruang Penyimpanan (VACUUM Engine)
- **Kompaksi Basis Data (`POST /api/settings/maintenance/shrink`)**: Menjalankan `VACUUM ANALYZE` (PostgreSQL) atau `VACUUM` (SQLite) untuk mereklamasi ruang penyimpanan disk pasca pembersihan data.
- **Inventori & Pembersihan Data Operasional (`POST /api/settings/maintenance/purge`)**: Opsi Reset Total dan Pembersihan Modular dengan proteksi ketat data master dan akun administrator.

---

## 🛠️ Teknologi & Arsitektur

| Komponen | Teknologi | Keterangan |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js 16 (React 19, TypeScript) | TurboPack bundler, App Router, Tailwind CSS, TailGrids UI Components |
| **Backend Framework** | ASP.NET Core 8.0 Web API | C# 12, Clean Architecture, Kestrel Web Server, .NET 8 LTS |
| **Database & ORM** | PostgreSQL 16 & SQLite (WAL Mode) | Entity Framework Core 8.0, Auto-seeding 42 Badges & Initial Rewards |
| **Autentikasi & Keamanan** | JWT Bearer Authentication | Token HMAC-SHA256, Refresh Token, Brute-Force Lockout Guard |
| **Containerization** | Docker & Docker Compose | Multi-container bridge network, persistent volumes (`pgdata`, `backend_uploads`) |
| **Engine Spreadsheet** | ClosedXML 0.104.2 | Format ARMS 21-kolom, Timesheet multi-sheet, Template Standar 9-kolom |
| **Dokumentasi API** | Swashbuckle OpenAPI (Swagger v3.1) | 100+ Endpoints terproteksi dengan Authorize Bearer Modal |
| **Styling & Theme** | CSS Custom Tokens & Google Fonts | 40 Dynamic Themes (22 Light + 18 Dark), 5 Google Fonts |
| **Client Libraries** | Lucide React, TanStack React Query, Sonner | Interaktivitas UI modern dan responsif |

---

## 🚀 Panduan Menjalankan Aplikasi

### 🐳 1. Menjalankan Menggunakan Docker (Sangat Disarankan)

Aplikasi dikemas dalam arsitektur multi-container siap produksi:

```bash
# Menjalankan kontainer di background (auto-build & auto-migrate DB)
docker compose up -d --build
```

#### Menggunakan Script Helper PowerShell (Windows):
```powershell
# Jalankan kontainer
.\docker-run.ps1 up

# Cek kesehatan koneksi PostgreSQL dan Backend API
.\docker-run.ps1 init-data

# Cek live streaming logs
.\docker-run.ps1 logs

# Cek status kontainer dan port
.\docker-run.ps1 status

# Hentikan kontainer
.\docker-run.ps1 down
```

> 📖 Untuk panduan lengkap Docker, volume data, backup, dan troubleshooting, lihat **[`DOCKER_GUIDE.md`](file:///c:/TEMP/VSCODE/TrackerKerjaModern/DOCKER_GUIDE.md)**.

---

### 💻 2. Menjalankan Mode Development Lokal

#### Menjalankan Backend (.NET 8):
```powershell
cd backend/src/TrackerKerja.WebApi
dotnet run --urls=http://localhost:5008
```

#### Menjalankan Frontend (Next.js 16):
```powershell
cd frontend
npm run dev
```

---

## 🌐 Endpoint & Akses Cepat

- **Frontend Web Application**: [http://localhost:3000](http://localhost:3000)
- **Backend Swagger REST API Documentation**: [http://localhost:5008/swagger](http://localhost:5008/swagger)
- **OpenAPI JSON Spec**: [http://localhost:5008/swagger/v1/swagger.json](http://localhost:5008/swagger/v1/swagger.json)
- **PostgreSQL Database**: Port `5432` (`trackerkerja_db`)

---

## 📚 Referensi Dokumentasi Lengkap

### Format Markdown (.md)
- 📐 **[`FSD.md`](FSD.md)** (atau [`documents/FSD_WORK_TRACKER_PRO.md`](documents/FSD_WORK_TRACKER_PRO.md)): **Dokumen Spesifikasi Fungsional (FSD)**, arsitektur modul, diagram Mermaid, tata letak studio bentang penuh, dan alur bisnis v4.0.
- 📘 **[`TSD.md`](TSD.md)** (atau [`documents/TSD_WORK_TRACKER_PRO.md`](documents/TSD_WORK_TRACKER_PRO.md)): **Dokumen Spesifikasi Teknis (TSD)**, controller & API retrieval procedures, arsitektur basis data relasional, katalog tabel, ERD lengkap, dan sample data v4.0.
- 📖 **[`USER_GUIDE.md`](USER_GUIDE.md)** (atau [`documents/USER_GUIDE.md`](documents/USER_GUIDE.md)): **Buku Panduan Pengguna (User Guide)** terpadu untuk Member, Leader, dan Administrator.
- 🐳 **[`DOCKER_GUIDE.md`](DOCKER_GUIDE.md)**: Panduan lengkap Docker multi-container, persistent volumes, backup data, dan otomatisasi deployment.
- 🧪 **[`QA/README.md`](QA/README.md)**: Panduan pengujian mutu (QA), konvensi penamaan test case, prosedur rilis, dan standar pengujian end-to-end.
- 📊 **[`QA/Tracking_Test_Case_E2E_TrackerKerja.xlsx`](QA/Tracking_Test_Case_E2E_TrackerKerja.xlsx)**: Workbook spreadsheet pelacakan eksekutif 72 E2E Test Case dengan formula dinamis dan status tracking.
- 📮 **[`TrackerKerja_Postman_Collection.json`](TrackerKerja_Postman_Collection.json)**: Koleksi Postman 2.1 untuk pengujian otomatis 100+ REST API endpoints.
- 🌐 **[`TrackerKerja_Postman_Environment.json`](TrackerKerja_Postman_Environment.json)**: Environment Postman lokal.
