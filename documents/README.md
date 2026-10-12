# 🚀 Work Tracker Pro (TrackerKerja)

> **Enterprise Work Task Management, Multi-Timer Timesheet Tracking, Attendance Management, Technical Documentation, & Team Performance Analytics Platform (v3.7 Multi-Company Isolation & Project Finance Edition)**

[![ASP.NET Core 8.0](https://img.shields.io/badge/ASP.NET%20Core-8.0%20MVC-512BD4?logo=dotnet&logoColor=white)](https://dotnet.microsoft.com/)
[![Entity Framework Core](https://img.shields.io/badge/EF%20Core-SQLite-blue?logo=sqlite&logoColor=white)](https://learn.microsoft.com/ef/core/)
[![ClosedXML](https://img.shields.io/badge/ClosedXML-0.104.2-emerald?logo=microsoft-excel&logoColor=white)](https://github.com/ClosedXML/ClosedXML)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![REST API](https://img.shields.io/badge/REST%20API-100%2B%20Endpoints-85EA2D?logo=swagger&logoColor=black)](http://localhost:5000/swagger)
[![JWT Bearer](https://img.shields.io/badge/Auth-Cookie%20%2B%20JWT%20Bearer-orange?logo=jsonwebtokens&logoColor=white)](http://localhost:5000/swagger)
[![Themes & Fonts](https://img.shields.io/badge/Themes%20%26%20Fonts-40%20Themes%20%7C%205%20Fonts-pink)](http://localhost:5000)
[![GitHub](https://img.shields.io/badge/GitHub-zhavick%2FTrackerKerja-181717?logo=github&logoColor=white)](https://github.com/zhavick/TrackerKerja.git)

---

## 🌟 Fitur Unggulan Sistem (v3.7)

### 🏢 1. Multi-Company Isolation & Registrasi Berbasis Kode Perusahaan
- **Zero-Knowledge Privacy Registration (`/Account/Register`)**: Formulir registrasi tidak menampilkan daftar publik nama perusahaan untuk mencegah kebocoran informasi dan enumerasi klien. Pengguna memilih:
  - *Masukkan Kode Perusahaan*: Memasukkan kode perusahaan yang valid (`ExistingCompanyCode`, otomatis diformat uppercase) untuk bergabung dengan tim yang sudah ada.
  - *Daftarkan Perusahaan Baru*: Mendaftarkan unit kerja baru dengan `NewCompanyName` dan `NewCompanyCode` unik (minimal 3 karakter alfanumerik uppercase).
- **Isolasi Data Ketat Multi-Tenant**: Seluruh kueri data (Proyek, Tugas, Timesheet, Presensi, Catatan, Anggota) secara ketat dibatasi berdasarkan `CompanyId` pengguna yang sedang login. Pengguna biasa sama sekali tidak dapat melihat data perusahaan lain.
- **Otorisasi Penuh Administrator Sistem**: Administrator memiliki hak akses global lintas perusahaan dengan dropdown filter `companyId` pada modul Proyek, Tugas, dan Anggota Tim.
- **Badge Perusahaan Topbar Navbar**: Bilah navigasi atas menampilkan identitas tenant aktif pengguna (`[KODE] Nama Perusahaan` untuk member, atau `[ADMIN] Semua Tim / Perusahaan` untuk Administrator).

### 🔐 2. Keamanan Enterprise & Autentikasi Ganda (Dual Auth)
- **Dual Authentication Pipeline**: Integrasi Cookie Session terenkripsi untuk peramban web dan **JWT Bearer Token** untuk RESTful API dan integrasi eksternal.
- **Strict Swagger JWT Authorization**: Dokumentasi OpenAPI/Swagger UI di `/swagger` dilengkapi tombol modal **Authorize** untuk menguji endpoint berotentikasi Bearer JWT.
- **Keamanan Sesi & Auto-Logout Inaktivitas 1 Jam (`session-manager.js`)**: Pemantauan idle real-time, dialog peringatan interaktif 5 menit dengan hitung mundur detik, dan proteksi redirect otomatis ke `/Account/Login?reason=timeout`.
- **Halaman Login Lottie Modern & Self-Service Reset Password**: Redesain visual modern dengan animasi Lottie, toggle mode gelap/terang instan tanpa reload, dan tautan *"Lupa Kata Sandi?"*.
- **Self-Service Password Reset & Fallback User Claim Link**: Form pemulihan mandiri (`/Account/ForgotPassword`). Apabila layanan SMTP belum dikonfigurasi, sistem secara otomatis menyediakan **Link User Claim** instan (`/Account/PasswordResetClaim`) dengan token 15 menit.
- **Strict Lockout Guard (Proteksi Akun Terkunci)**: Proteksi otomatis mengunci akun pengguna selama **30 menit** jika token kedaluwarsa atau terjadi salah re-entry / konfirmasi password sebanyak 3 kali berturut-turut.

### 👥 3. Direktori Anggota Tim, Grouping Perusahaan Admin & Modular Card
- **Grouping Anggota per Perusahaan (Khusus Login Administrator)**: Administrator disajikan tampilan direktori tim yang secara otomatis terkelompok (*grouped*) per perusahaan dengan header khusus (ikon, nama, badge kode perusahaan, counter personel, dan mini KPIs: rasio tugas selesai dan akumulasi jam kerja tim).
- **Arsitektur Modular Kartu Anggota (`_MemberCard.cshtml`)**: Komponen profil kartu anggota tim dienkapsulasi ke dalam partial view terpisah untuk performa render optimal dan konsistensi visual.
- **Direktori Pure Grid Card Layout**: Kartu anggota tim berstruktur grid responsif dengan proteksi anti-overflow (*text-ellipsis* dan tooltip hover).
- **Kustomisasi Banner Sampul Profil (`CoverPictureUrl`)**: Unggah cover banner profil atau gunakan template vektor SVG default (`default-profile-cover.svg`).
- **Fitur Hapus Permanen Akun (*Permanent User Deletion*)**: Khusus peran Administrator dengan proteksi verifikasi nama target dan kata sandi admin.

### 💼 4. Manajemen Proyek, Analitik Finansial & Alokasi Massal Tugas
- **Pelacakan Keuangan Proyek (Project Financials)**: Pencatatan Pagu Anggaran (*Budget*) dan Biaya Aktual (*Actual Cost*) per proyek.
- **Indikator Visual Financial Burn Rate (%)**: Menampilkan serapan biaya secara real-time dengan kode warna dinamis: Hijau (<80%), Kuning/Amber (80-100%), dan Merah/Rose (>100% Peringatan Overbudget).
- **Identitas Klien & Project Manager (PM)**: Kolom Nama Klien (*ClientName*) dan penugasan Project Manager (*ProjectManagerId*) dari tim.
- **Alokasi Massal Tugas ke Proyek (Bulk Task Assignment)**: Modal checklist pada detail proyek (`/Project/Details/{id}`) untuk menugaskan sekumpulan tugas lepas ke dalam proyek dalam satu klik (`POST /Project/AssignTasks`).
- **Standarisasi Tata Letak Lebar (Wide Layout)**: Antarmuka Proyek diselaraskan dengan tata letak layar penuh responsif serasi dengan modul Kalender dan Presensi.

### ⏱️ 5. Timesheet, Multi-Timer & Penyatuan Form Edit Tugas
- **Penyatuan Formulir Edit Tugas & Timesheet Manual (`SaveTaskAndSession`)**: Satu tombol simpan terpadu untuk memperbarui detail tugas dan mencatat sesi jam kerja manual baru sekaligus secara atomik.
- **Multi-Timer Serentak**: Menjalankan beberapa timer tugas bersamaan tanpa saling mengganggu antar pengguna.
- **Laporan Excel Timesheet Resmi (ClosedXML)**: Ekspor multi-sheet dengan rincian harian, rekapitulasi per proyek, konversi Man-Days, dan formula otomatis.

### 🎮 6. Gamifikasi, Aturan Poin 15 & 30 Hari & Reset Saldo Bulanan
- **Saldo Bulanan Dimulai dari 0**: Akumulasi saldo poin check-in seluruh pengguna dimulai kembali dari `0` pada awal bulan kalender untuk menjaga konsistensi absensi yang aktif.
- **Aturan Akumulasi Poin Check-In 15 & 30 Hari**:
  - *15 Hari Check-In*: Memperoleh **1/2 (50%)** dari total akumulasi target poin check-in bulanan.
  - *30 Hari Check-In (Penuh)*: Memperoleh **1x (100%)** total akumulasi poin bulanan secara utuh.
- **Akumulasi Poin Badge Aditif**: Poin dari 40+ lencana prestasi (*Master Badges*) bersifat permanen dan **ditambahkan langsung di atas** saldo akumulasi poin check-in bulanan.
- **Daily Check-In Harian & Aturan Streak (Reset 2 Hari)**: Tombol *1-click check-in* (+10 Poin) dan streak counter api. Toleransi absen 2 hari berturut-turut sebelum streak di-reset ke Hari 1.
- **Modul Klaim Hadiah (Reward Claim)**: Saldo poin dapat ditukar ke Voucher Pulsa/E-Wallet, Kopi, Merchandise, atau Hadiah Bulanan dengan kalkulasi saldo ketat (1 Poin = Rp 100) dan approval Administrator.

### 📢 7. Modul Pengumuman Resmi & Modal Popup Terpadu (Announcement Module)
- **Pengelolaan Pengumuman oleh Administrator (`/Announcement`)**: Admin dapat membuat, mengedit, menghapus, dan mengaktifkan/menonaktifkan pengumuman melalui antarmuka tabel interaktif lengkap dengan kartu metrik statistik dan simulator pratinjau modal popup.
- **Formulir Isian Lengkap**:
  - *Judul Pengumuman*: Judul resmi yang tampil di header popup modal.
  - *Tanggal Pemberitahuan / Pengumuman*: Tanggal mulai pengumuman ditayangkan kepada seluruh pengguna.
  - *Tanggal Berakhir*: Tanggal batas akhir pengumuman (otomatis kedaluwarsa setelah tanggal ini).
  - *Status*: Pilihan kategori **"Informasi Penting"** (peringatan mendesak, warna merah/rose dengan banner darurat) atau **"Pengumuman Umum"** (informasi standar, warna ungu/indigo).
  - *Isi Pengumuman*: Teks pengumuman lengkap atau instruksi kerja.
  - *Status Aktif*: Toggle switch aktif/nonaktif.
- **Impact Modal Popup ke Seluruh Pengguna**: Pengumuman aktif langsung muncul di layar pengguna saat membuka aplikasi dalam bentuk modal popup responsif.
- **Sequencing Ketat dengan Panduan (Anti-Overlap Rule)**:
  - Modal pengumuman **tidak akan pernah muncul berbarengan** dengan panduan pengguna (baik Onboarding Welcome Tour maupun User Guide Modal).
  - Jika pengguna belum menutup panduan, pengumuman tetap menunggu di latar belakang.
  - Segera setelah pengguna menutup panduan, modal pengumuman otomatis muncul ke layar dengan transisi animasi halus.
- **Kontrol Pengguna ("Jangan Tampilkan Lagi")**: Pengguna dapat menandai opsi agar pengumuman yang sudah dibaca tidak muncul kembali berulang kali.

### 🎨 7. 40 Tema Eye-Friendly & 5 Google Fonts Switcher
- **40 Tema Tampilan Dinamis**: 22 Tema Terang + 18 Tema Gelap ramah mata bertenaga CSS custom tokens (`themes.css`).
- **Global Font Switcher**: 5 opsi Google Fonts pilihan (*Inter, Plus Jakarta Sans, Outfit, Poppins, Roboto*) instan tanpa reload halaman (*Anti-FOUC*).
- **Tur Interaktif Layar (*Interactive Onboarding Tour*)**: 6 spotlight interaktif memandu pengguna baru (`onboarding-tour.js`).
- **Paginasi Grid Tabel AJAX (*Zero Reload*)**: Navigasi tabel Tugas, Anggota Tim, Presensi, Audit Trail, dan Timesheet instan (`ajax-grid-manager.js`).

### 🖥️ 8. Tata Letak Studio Bentang Penuh (Full-Width Responsive Studio Layout)
- **Desain Studio 2-Kolom Ergonomis**: Seluruh formulir kerja inti telah di-refactor menggunakan layout bentang penuh (`w-full` dengan CSS Grid 12-kolom `lg:grid-cols-12`):
  - **Detail & Edit Tugas (`/Task/Edit/{id}`)**: Kolom Kiri 8-kolom untuk konten tugas, log *Obstacle & Solution*, jam kerja manual, dan catatan terkait; Kolom Kanan 4-kolom *sticky* untuk status alur kerja, slider progress, penugasan PIC, prioritas, milestone waterfall, proyek, jadwal, dan sub-tugas.
  - **Edit Catatan (`/Note/Edit/{id}`)**: Area pengetikan editor Quill.js yang luas (min-height 420px), dropzone berkas lampiran multi-file, dan sidebar inspektor kategori/warna.
  - **Edit Anggota Tim (`/Member/Edit/{id}`)**: Formulir identitas anggota dan sidebar inspektor hak akses peran (*Role*) serta aksen avatar.
  - **Profil Pengguna & Cover (`/Account/Profile`)**: Tampilan banner sampul *Ultra-Wide Panoramic*, formulir profil dan keamanan kata sandi bentang penuh.
  - **Edit Proyek (`/Project/Edit/{id}`)**: Ruang lingkup dan analitik anggaran/finansial di kolom utama, status alur kerja dan penugasan Project Manager (PM) di sidebar inspektor.
- **Bilah Aksi Mengambang (*Sticky Bottom Action Bar*)**: Membentang penuh di bagian bawah layar memudahkan penyimpanan instan satu klik tanpa perlu menggulir (*scroll*) halaman.

### 🧪 9. Paket Pengujian Mutu (QA) & E2E Test Case Tracking Matrix
- **Spreadsheet Pelacakan Interaktif (`QA/Tracking_Test_Case_E2E_TrackerKerja.xlsx`)**:
  - *Dashboard & Metrics*: Kartu KPI eksekutif dengan formula dinamis (`COUNTA`, `COUNTIF`, `% Completion`, `% Pass Rate`) dan tabel ringkasan status 19 modul aplikasi.
  - *E2E Test Cases Master*: 65+ skenario pengujian end-to-end terstruktur mencakup alur positif, negatif, keamanan RBAC, dan validasi data dengan dropdown validation & conditional formatting.
  - *Execution Cycles*: Pelacakan siklus rilis pengujian (*Smoke/Sanity, Regression, Interoperability, UAT*).
  - *Defect Log*: Pencatatan temuan bug terhubung dengan ID Test Case, tingkat keparahan (*Severity*), dan penugasan developer.
- **Buku Panduan Standar QA (`QA/README.md`)**: Konvensi penamaan test case (`TC-[MODUL]-[NO]`), matriks keparahan defect, dan siklus rilis pengujian mutu.

### 🛡️ 10. Konfigurasi Sistem 4-Tab Modular, Audit Trail & Backup
- **Arsitektur Konfigurasi 4-Tab Modular (`/Configuration`)**:
  1. *Sinkronisasi Host Induk & Cabang*: Parameter host, uji ping, push/pull sync.
  2. *Database & Pemeliharaan*: Monitoring SQLite, VACUUM compaction, backup/restore `.db` & `.sql`.
  3. *Server Email & Notifikasi*: Pengaturan SMTP, live latency diagnostics, dan 7 template email event WYSIWYG.
  4. *Umum & Swagger API*: Global base URL, runtime environment, dan link Swagger docs.
- **Popup Modal Detail Audit Trail**: Inspeksi detail aktivitas audit, parameter HTTP, IP address, waktu eksekusi, dan detail perubahan data secara instan dalam modal responsif.

---

## 🛠️ Teknologi & Arsitektur

| Komponen | Teknologi | Keterangan |
| :--- | :--- | :--- |
| **Framework Backend** | ASP.NET Core 8.0 MVC & Web API | C# 12, Kestrel Web Server, .NET 8 LTS |
| **Database & ORM** | SQLite + Entity Framework Core 8.0 | Auto-migration & Database Seeder |
| **Autentikasi & Keamanan** | Dual Auth: Cookie + JWT Bearer | Identity PBKDF2, Strict Swagger JWT, Inactivity Guard (60 min) |
| **Containerization** | Docker & Docker Compose | Multi-stage build, persistent data volumes (`./db_data`, `./uploads`) |
| **Engine Spreadsheet** | ClosedXML 0.104.2 | Format ARMS 21-kolom, Timesheet multi-sheet, Standard 9-kolom |
| **Dokumentasi API** | Swashbuckle OpenAPI (Swagger v3.1) | 100+ Endpoints terproteksi dengan Authorize Bearer Modal |
| **Styling & Theme** | Tailwind CSS + CSS Custom Tokens | 40 Dynamic Themes (22 Light + 18 Dark), 5 Google Fonts |
| **Client Libraries** | SortableJS, FullCalendar, Chart.js, Quill.js, Lottie | Interaktivitas UI modern dan responsif |

---

## 🚀 Panduan Menjalankan Aplikasi

### 🐳 1. Menjalankan Menggunakan Docker (Sangat Disarankan)

Aplikasi telah dikemas siap pakai dengan Docker & Docker Compose. Database dan file upload tetap tersimpan secara persisten pada host machine.

```bash
# Menjalankan container di background (auto-build & auto-migrate DB)
docker compose up -d --build
```

#### Atau Gunakan Script Helper (PowerShell Windows):
```powershell
# Inisialisasi data lokal ke volume Docker
.\docker-run.ps1 init-data

# Jalankan container
.\docker-run.ps1 up

# Cek streaming log container
.\docker-run.ps1 logs

# Cek status
.\docker-run.ps1 status

# Hentikan container
.\docker-run.ps1 down
```

> 📖 Untuk panduan lengkap Docker, volume data, backup, dan troubleshooting, lihat **[DOCKER_GUIDE.md](file:///c:/TEMP/VSCODE/TrackerKerja/DOCKER_GUIDE.md)**.

---

### 💻 2. Menjalankan Mode Development (.NET SDK)
Pastikan [.NET 8.0 SDK](https://dotnet.microsoft.com/download/dotnet/8.0) telah terinstal.

```bash
# Clone repository
git clone https://github.com/zhavick/TrackerKerja.git
cd TrackerKerja

# Jalankan aplikasi
dotnet run --urls=http://localhost:5000
```

---

### 📦 3. Mempublikasikan ke Release Build Standalone
```bash
# Publish aplikasi ke folder ./publish
dotnet publish -c Release -o ./publish

# Jalankan executable hasil publish
cd publish
dotnet TrackerKerja.dll --urls=http://localhost:5000
```

---

## 🐙 Repositori GitHub & Push Helper

Repositori proyek: 👉 **[https://github.com/zhavick/TrackerKerja.git](https://github.com/zhavick/TrackerKerja.git)**

Untuk mengunggah kode terbaru ke GitHub menggunakan Personal Access Token (PAT):
```powershell
# Jalankan script helper push
.\git-push.ps1
```

---

## 🌐 Endpoint & Akses Cepat

- **Web Dashboard**: [http://localhost:5000](http://localhost:5000)
- **Swagger REST API Documentation**: [http://localhost:5000/swagger](http://localhost:5000/swagger)
- **OpenAPI JSON Spec**: [http://localhost:5000/swagger/v1/swagger.json](http://localhost:5000/swagger/v1/swagger.json)

---

## 📚 Referensi Dokumentasi Lengkap

### Format Markdown (.md)
- 📐 **[FSD_WORK_TRACKER_PRO.md](file:///c:/TEMP/VSCODE/TrackerKerja/FSD_WORK_TRACKER_PRO.md)**: Dokumen Spesifikasi Fungsional (FSD), arsitektur modul, diagram Mermaid, dan alur bisnis.
- 📘 **[TSD_WORK_TRACKER_PRO.md](file:///c:/TEMP/VSCODE/TrackerKerja/TSD_WORK_TRACKER_PRO.md)**: Dokumen Spesifikasi Teknis (TSD), controller & API retrieval procedures, arsitektur basis data, ERD, dan sample data.
- 📖 **[USER_GUIDE.md](file:///c:/TEMP/VSCODE/TrackerKerja/USER_GUIDE.md)**: Panduan pengguna menyeluruh dengan alur kerja seluruh fitur dan modul.
- 🧪 **[QA/README.md](file:///c:/TEMP/VSCODE/TrackerKerja/QA/README.md)**: Panduan pengujian mutu (QA), prosedur rilis, dan standar pengujian end-to-end.
- 📊 **[QA/Tracking_Test_Case_E2E_TrackerKerja.xlsx](file:///c:/TEMP/VSCODE/TrackerKerja/QA/Tracking_Test_Case_E2E_TrackerKerja.xlsx)**: Workbook spreadsheet pelacakan eksekutif 65+ E2E Test Case dengan formula dinamis dan status tracking.
- 🐳 **[DOCKER_GUIDE.md](file:///c:/TEMP/VSCODE/TrackerKerja/DOCKER_GUIDE.md)**: Panduan lengkap Docker, volume data, backup, dan perintah maintenance.

### Format Microsoft Word (.docx - Tampilan Eksekutif & Profesional)
- 📄 **[FSD_WORK_TRACKER_PRO.docx](file:///c:/TEMP/VSCODE/TrackerKerja/FSD_WORK_TRACKER_PRO.docx)**: Dokumen FSD resmi berformat Microsoft Word dengan Cover Page, Running Header/Footer, dan Tabel Terformat.
- 📄 **[TSD_WORK_TRACKER_PRO.docx](file:///c:/TEMP/VSCODE/TrackerKerja/TSD_WORK_TRACKER_PRO.docx)**: Dokumen TSD resmi berformat Microsoft Word mencakup seluruh spesifikasi API, controller, prosedur, skema 21 tabel, dan sample data.
- 📄 **[USER_GUIDE_WORK_TRACKER_PRO.docx](file:///c:/TEMP/VSCODE/TrackerKerja/USER_GUIDE_WORK_TRACKER_PRO.docx)** (atau **[USER_GUIDE.docx](file:///c:/TEMP/VSCODE/TrackerKerja/USER_GUIDE.docx)**): Buku panduan operasional pengguna lengkap siap cetak/distribusi.
