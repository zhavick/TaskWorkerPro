# Buku Panduan Pengguna (User Guide)
# Work Tracker Pro (TrackerKerja)

> **Versi Aplikasi**: 3.8 (Full-Width Studio Layout, Projects REST API & Enterprise QA Testing Edition)  
> **Target Pengguna**: Seluruh Karyawan, System Analyst, Developer, QA, Technical Writer, Project Lead, dan Administrator  
> **Terakhir Diperbarui**: 08 Oktober 2026  

---

## Daftar Isi Panduan

1. [Pengenalan & Memulai Aplikasi](#1-pengenalan--memulai-aplikasi)
   - 1.1 [Halaman Masuk (Login Modern Lottie, Registrasi Kode Perusahaan & Admin Approval)](#11-halaman-masuk-login-modern-lottie-registrasi-kode-perusahaan--admin-approval)
   - 1.2 [Tata Letak Antarmuka, Topbar Minimalis, Tur Layar & Paginasi Grid AJAX](#12-tata-letak-antarmuka-topbar-minimalis-tur-layar--paginasi-grid-ajax)
   - 1.3 [Kustomisasi 40 Tema Tampilan & 5 Google Fonts Switcher](#13-kustomisasi-40-tema-tampilan--5-google-fonts-switcher)
   - 1.4 [Keamanan Sesi, Peringatan 5 Menit & Auto-Logout Inaktivitas 1 Jam](#14-keamanan-sesi-peringatan-5-menit--auto-logout-inaktivitas-1-jam)
   - 1.5 [Prosedur Pengaturan Ulang Kata Sandi (Reset Password & User Claim Link)](#15-prosedur-pengaturan-ulang-kata-sandi-reset-password--user-claim-link)
2. [Dashboard & Ringkasan Kinerja](#2-dashboard--ringkasan-kinerja)
   - 2.1 [Kartu Metrik & Statistik Pribadi](#21-kartu-metrik--statistik-pribadi)
   - 2.2 [Pemberitahuan & Notifikasi Lonceng](#22-pemberitahuan--notifikasi-lonceng)
   - 2.3 [Distribusi Tugas & Beban Kerja Proyek](#23-distribusi-tugas--beban-kerja-proyek)
3. [Modul Task (Manajemen Tugas Kerja)](#3-modul-task-manajemen-tugas-kerja)
   - 3.1 [Membuat Tugas Baru](#31-membuat-tugas-baru)
   - 3.2 [Daftar Tugas & Filter Pencarian Cepat](#32-daftar-tugas--filter-pencarian-cepat)
   - 3.3 [Memperbarui Status & Slider Kemajuan (0–100%)](#33-memperbarui-status--slider-kemajuan-0100)
   - 3.4 [Sub-Task (Hierarki Tugas Induk & Anak)](#34-sub-task-hierarki-tugas-induk--anak)
   - 3.5 [Mencatat Kendala (Obstacle) & Solusi Teknis](#35-mencatat-kendala-obstacle--solusi-teknis)
   - 3.6 [Papan Kanban Interaktif (Geser & Letakkan)](#36-papan-kanban-interaktif-geser--letakkan)
   - 3.7 [Import Data Tugas dari Excel (Format Standar & Format ARMS)](#37-import-data-tugas-dari-excel-format-standar--format-arms)
   - 3.8 [Penyatuan Formulir Edit Tugas & Pengisian Jam Kerja Manual (Satu Tombol Simpan)](#38-penyatuan-formulir-edit-tugas--pengisian-jam-kerja-manual-satu-tombol-simpan)
4. [Modul Project (Manajemen Proyek, Finansial & Alokasi Massal Tugas)](#4-modul-project-manajemen-proyek-finansial--alokasi-massal-tugas)
   - 4.1 [Membuat & Mengelola Proyek (Client, PM, Budget & Actual Cost)](#41-membuat--mengelola-proyek-client-pm-budget--actual-cost)
   - 4.2 [Analitik Finansial, Indikator Burn Rate & Linimasa Proyek](#42-analitik-finansial-indikator-burn-rate--linimasa-proyek)
   - 4.3 [Alokasi Massal Tugas ke Proyek (Bulk Task Assignment)](#43-alokasi-massal-tugas-ke-proyek-bulk-task-assignment)
5. [Modul Timesheet & Pelacakan Jam Kerja](#5-modul-timesheet--pelacakan-jam-kerja)
   - 5.1 [Pencatatan Jam Otomatis (Live Timer / Clock In & Clock Out)](#51-pencatatan-jam-otomatis-live-timer--clock-in--clock-out)
   - 5.2 [Penggunaan Multi-Timer Bersamaan](#52-penggunaan-multi-timer-bersamaan)
   - 5.3 [Pencatatan Jam Kerja Manual](#53-pencatatan-jam-kerja-manual)
   - 5.4 [Notifikasi Pengingat Pengisian Timesheet (Cut-Off Tanggal 25)](#54-notifikasi-pengingat-pengisian-timesheet-cut-off-tanggal-25)
   - 5.5 [Export Laporan Excel Timesheet Resmi (Format Standar Elistec)](#55-export-laporan-excel-timesheet-resmi-format-standar-elistec)
6. [Modul Absensi & Presensi Kerja (Attendance)](#6-modul-absensi--presensi-kerja-attendance)
   - 6.1 [Pencatatan Check-In & Check-Out Harian](#61-pencatatan-check-in--check-out-harian)
   - 6.2 [Status Kehadiran Fleksibel (Hadir, WFH, Sakit, Izin, Cuti, Libur)](#62-status-kehadiran-fleksibel-hadir-wfh-sakit-izin-cuti-libur)
   - 6.3 [Monitoring Rekapitulasi Presensi Tim](#63-monitoring-rekapitulasi-presensi-tim)
7. [Modul Kalender Kerja & Jadwal (Calendar)](#7-modul-kalender-kerja--jadwal-calendar)
   - 7.1 [Tampilan Kalender Berbasis Peran (RBAC Filter)](#71-tampilan-kalender-berbasis-peran-rbac-filter)
   - 7.2 [Fitur Khusus Administrator (Dropdown Semua Tugas vs Tugas Saya)](#72-fitur-khusus-administrator-dropdown-semua-tugas-vs-tugas-saya)
   - 7.3 [Deteksi Irisan Jadwal & Detail PIC](#73-deteksi-irisan-jadwal--detail-pic)
8. [Modul Catatan Kerja & Dokumentasi (Notes)](#8-modul-catatan-kerja--dokumentasi-notes)
   - 8.1 [Membuat Catatan dengan Rich-Text Editor](#81-membuat-catatan-dengan-rich-text-editor)
   - 8.2 [Menyematkan Catatan Penting (Pin Note)](#82-menyematkan-catatan-penting-pin-note)
   - 8.3 [Menghubungkan Catatan ke Tugas atau Proyek](#83-menghubungkan-catatan-ke-tugas-atau-proyek)
   - 8.4 [Mengunggah Berkas Lampiran](#84-mengunggah-berkas-lampiran)
9. [Modul JSON Payload Tools](#9-modul-json-payload-tools)
   - 9.1 [Merapikan Format JSON (Beautify)](#91-merapikan-format-json-beautify)
   - 9.2 [Validasi Sintaks & Minify JSON](#92-validasi-sintaks--minify-json)
   - 9.3 [Penyimpanan Template Payload Pengujian](#93-penyimpanan-template-payload-pengujian)
10. [Modul SQL Beautifier & Formatter Tools](#10-modul-sql-beautifier--formatter-tools)
    - 10.1 [Format & Beautify 15+ Dialek SQL Engine](#101-format--beautify-15-dialek-sql-engine)
    - 10.2 [Validasi Sintaks & Minifikasi Kueri](#102-validasi-sintaks--minifikasi-kueri)
    - 10.3 [Penyimpanan Snippet Kueri SQL Terkait Tugas](#103-penyimpanan-snippet-kueri-sql-terkait-tugas)
11. [Modul Laporan & Analitik Kinerja](#11-modul-laporan--analitik-kinerja)
12. [Modul Anggota Tim (Member), Grouping Perusahaan Admin, Pure Grid Card & Banner Cover](#12-modul-anggota-tim-member-grouping-perusahaan-admin-pure-grid-card--banner-cover)
13. [Modul Master Data, Konfigurasi 4-Tab, Sinkronisasi Multi-Instance & Backup](#13-modul-master-data-konfigurasi-4-tab-sinkronisasi-multi-instance--backup)
    - 13.1 [Arsitektur Konfigurasi Sistem 4-Tab Modular](#131-arsitektur-konfigurasi-sistem-4-tab-modular)
    - 13.2 [Master Kategori, Prioritas, dan Status](#132-master-kategori-prioritas-dan-status)
    - 13.3 [Master Milestone SDLC Waterfall](#133-master-milestone-sdlc-waterfall)
    - 13.4 [Master Hari Libur Nasional](#134-master-hari-libur-nasional)
    - 13.5 [Sinkronisasi Multi-Instance ke Host Induk (Online Streaming Base64 & Paket ZIP)](#135-sinkronisasi-multi-instance-ke-host-induk-online-streaming-base64--paket-zip)
    - 13.6 [Backup & Restore Database (.db & .sql)](#136-backup--restore-database-db--sql)
    - 13.7 [Integrasi Server Email (SMTP), Diagnostik Koneksi & 7 Template Event](#137-integrasi-server-email-smtp-diagnostik-koneksi--7-template-event)
    - 13.8 [Audit Trail & Modal Detail Aktivitas](#138-audit-trail--modal-detail-aktivitas)
14. [Modul Gamifikasi, Aturan Poin 15 & 30 Hari, Daily Check-In & Hadiah](#14-modul-gamifikasi-aturan-poin-15--30-hari-daily-check-in--hadiah)
    - 14.1 [Saldo Awal Bulanan (0), Aturan Poin 15/30 Hari & Aturan Streak (Reset 2 Hari)](#141-saldo-awal-bulanan-0-aturan-poin-1530-hari--aturan-streak-reset-2-hari)
    - 14.2 [Milestone Bulanan (Streak 30 Hari) & Hadiah Spesial](#142-milestone-bulanan-streak-30-hari--hadiah-spesial)
    - 14.3 [Koleksi 40+ Master Badge Gaul & Modern Anak Muda](#143-koleksi-40-master-badge-gaul--modern-anak-muda)
    - 14.4 [Katalog Hadiah & Penukaran Poin (1 Poin = Rp 100)](#144-katalog-hadiah--penukaran-poin-1-poin--rp-100)
    - 14.5 [Manajemen Master Hadiah & Persetujuan Klaim (Admin Approval)](#145-manajemen-master-hadiah--persetujuan-klaim-admin-approval)
15. [Tata Letak Studio Bentang Penuh (Full-Width Responsive Studio Layout)](#15-tata-letak-studio-bentang-penuh-full-width-responsive-studio-layout)
    - 15.1 [Prinsip Kerja Kanvas Studio 2-Kolom & Bilah Aksi Bawah](#151-prinsip-kerja-kanvas-studio-2-kolom--bilah-aksi-bawah)
    - 15.2 [Operasional Halaman Edit Tugas (/Task/Edit)](#152-operasional-halaman-edit-tugas-taskedit)
    - 15.3 [Operasional Halaman Edit Catatan (/Note/Edit)](#153-operasional-halaman-edit-catatan-noteedit)
    - 15.4 [Operasional Halaman Edit Anggota Tim (/Member/Edit)](#154-operasional-halaman-edit-anggota-tim-memberedit)
    - 15.5 [Operasional Halaman Edit Proyek (/Project/Edit)](#155-operasional-halaman-edit-proyek-projectedit)
    - 15.6 [Operasional Halaman Profil Akun (/Account/Profile)](#156-operasional-halaman-profil-akun-accountprofile)
16. [Panduan Pengujian Mutu (QA) & Pelacakan Test Case E2E Excel](#16-panduan-pengujian-mutu-qa--pelacakan-test-case-e2e-excel)
    - 16.1 [Struktur Paket Pengujian QA & Berkas Matriks](#161-struktur-paket-pengujian-qa--berkas-matriks)
    - 16.2 [Navigasi 4 Lembar Kerja Buku Tracking Excel](#162-navigasi-4-lembar-kerja-buku-tracking-excel)
    - 16.3 [Prosedur Eksekusi Pengujian & Pencatatan Bug (Defect Logging)](#163-prosedur-eksekusi-pengujian--pencatatan-bug-defect-logging)
17. [Tips & Pertanyaan Umum (FAQ)](#17-tips--pertanyaan-umum-faq)

---

## 1. Pengenalan & Memulai Aplikasi

**Work Tracker Pro (TrackerKerja)** adalah aplikasi manajemen pekerjaan terpadu yang dirancang untuk mempermudah tim dalam merencanakan tugas, mencatat waktu kerja secara akurat (*timesheet*), mengelola absensi kehadiran, mendokumentasikan kendala dan solusi teknis, mengolah payload data/SQL, serta menghasilkan laporan kerja siap pakai.

### 1.1 Halaman Masuk (Login Modern Lottie, Registrasi Kode Perusahaan & Admin Approval)
1. **Masuk ke Aplikasi (Login)**:
   - Buka peramban web dan akses alamat aplikasi TrackerKerja.
   - Halaman login dilengkapi animasi visual **Lottie modern**, tombol sakelar instan **Mode Gelap / Terang** di pojok kanan atas tanpa reload, dan dropdown perusahaan bertenaga **Select2**.
   - Masukkan **Alamat Email** dan **Kata Sandi (Password)** Anda yang telah terverifikasi.
   - Beri tanda centang pada opsi **Ingat Saya (Remember Me)** jika Anda ingin sesi login tetap tersimpan pada perangkat pribadi.
   - Klik tombol **Masuk (Login)** untuk masuk ke Dashboard utama.
   - *Catatan Keamanan*: Jika sesi Anda kedaluwarsa karena tidak ada aktivitas selama 1 jam, sistem otomatis mengalihkan Anda kembali ke halaman ini dengan notifikasi kuning: *"Sesi Anda telah berakhir karena tidak ada aktivitas selama 1 jam. Silakan masuk kembali."*

2. **Pendaftaran Pengguna Baru Berbasis Kode Perusahaan (Zero-Knowledge Privacy)**:
   - Pada halaman login, klik tombol **Daftar Akun Baru**.
   - Demi melindungi kerahasiaan bisnis dan mencegah kebocoran daftar klien perusahaan ke publik, formulir registrasi **tidak menampilkan daftar publik nama-nama perusahaan**.
   - Isi formulir pendaftaran:
     - **Nama Lengkap**: Nama lengkap Anda.
     - **Alamat Email**: Email aktif kantor atau pribadi.
     - **Jabatan / Posisi**: Peran kerja Anda (misal: *Lead Developer*, *Quality Assurance*, *System Analyst*).
     - **Pilihan Afiliasi Perusahaan**:
       1. **Masukkan Kode Perusahaan**: Pilih opsi ini jika kantor/tim Anda telah terdaftar. Masukkan **Kode Perusahaan** (contoh: `ELISTEC`, `ACME`). Sistem akan mencocokkan kode secara otomatis dengan huruf kapital (*case-insensitive*).
       2. **Daftarkan Perusahaan Baru**: Pilih opsi ini jika Anda adalah personel pertama yang mendaftarkan kantor/unit kerja baru. Masukkan **Nama Perusahaan** dan tentukan **Kode Perusahaan Baru** yang unik (minimal 3 karakter alfanumerik huruf kapital, misal: `CORP`). Kode ini nantinya dapat Anda bagikan kepada rekan tim agar mereka dapat bergabung ke tenant perusahaan Anda.
     - **Kata Sandi & Konfirmasi Kata Sandi**: Minimal 6 karakter dengan kombinasi huruf dan angka.
   - Klik **Daftar Sekarang**.
   - *Prinsip Isolasi Data*: Setelah akun aktif, Anda hanya dapat melihat dan mengelola tugas, proyek, presensi, timesheet, catatan, dan anggota tim milik perusahaan Anda sendiri.

3. **Alur Persetujuan Administrator (Admin Approval)**:
   - Setelah formulir registrasi dikirimkan, akun baru Anda akan berstatus **Menunggu Persetujuan (Pending Approval)**.
   - Anda **belum dapat login** ke aplikasi sampai Administrator meninjau dan menyetujui akun Anda.
   - Sistem akan secara otomatis mengirimkan notifikasi email ke Administrator.
   - Begitu Administrator menyetujui akun Anda, Anda akan menerima email pemberitahuan resmi bahwa akun telah aktif dan siap digunakan untuk login.
   - *(Bagi Administrator)*: Untuk meninjau pendaftaran baru, buka menu **Anggota Tim (`/Member`)**, buka tab **Menunggu Persetujuan**, lalu klik tombol hijau **Setujui (Approve)** atau tombol merah **Tolak (Reject)** jika pendaftaran tidak valid.

### 1.2 Tata Letak Antarmuka, Topbar Minimalis, Tur Layar & Paginasi Grid AJAX
Aplikasi TrackerKerja dirancang dengan antarmuka yang bersih, modern, dan ergonomis:
- **Bilah Samping (Sidebar)**: Pusat navigasi seluruh modul kerja (Dashboard, Tugas, Kanban, Proyek, Timesheet, Absensi, Kalender, Catatan, JSON Tools, SQL Tools, Laporan, Anggota Tim, Master Data, Konfigurasi Sistem, **Swagger API**, dan **Panduan Pengguna PDF**).
- **Bilah Atas (Topbar)**: Menampilkan judul halaman aktif, badge nama perusahaan/tim Anda, kotak pencarian cepat global, tombol aksi cepat *Import Excel*, lonceng notifikasi tugas cerdas, pemilih 40 tema dinamis & 5 font, serta kartu avatar profil akun dengan tombol dropdown navigasi lengkap.
- **Tur Interaktif Layar (*Interactive Onboarding Tour*)**:
  - Saat pertama kali menggunakan aplikasi atau kapan saja dibutuhkan, Anda dapat memulai tur interaktif 6 langkah yang menyoroti modul-modul esensial.
  - Untuk memulai tur, klik menu profil Anda lalu pilih **Mulai Tur Aplikasi**, atau klik tombol bantuan di halaman panduan pengguna.
- **Paginasi Grid Tabel AJAX (*Zero Reload* - `ajax-grid-manager.js`)**:
  - Seluruh tabel utama (Tugas, Anggota Tim, Presensi, Audit Trail, dan Timesheet) mendukung navigasi halaman instan tanpa perlu memuat ulang seluruh halaman peramban web (*zero page reload*).
  - Pilihan sorting kolom, pencarian, dan perpindahan nomor halaman terjadi secara mulus dengan tetap mempertahankan posisi scroll dan status filter.

### 1.3 Kustomisasi 40 Tema Tampilan & 5 Google Fonts Switcher
Aplikasi menyediakan 40 pilihan tema warna eye-friendly dan 5 opsi jenis huruf Google Fonts:
1. **Pemilih Tema Cepat (40 Tema)**:
   - Klik tombol **Tema** di bilah atas (Topbar) atau melalui menu profil.
   - **22 Tema Terang (Light Themes)**: Indigo Nebula, Emerald Forest, Ocean Azure, Sunset Crimson, Cyberpunk Neon, Royal Amethyst, Amber Gold, Slate Minimalist, Nordic Teal, Midnight Titanium, dan 12 tema eye-friendly lainnya.
   - **18 Tema Gelap (Dark Themes)**: Nordic Frost, Midnight OLED, Cyberpunk Synthwave, Emerald Matrix, Dracula Eclipse, Abyssal Ocean, Solar Ember, dan tema ramah mata malam hari lainnya.
   - Seluruh elemen warna berganti seketika (*instant CSS transition*).
2. **Global Font Switcher (5 Pilihan Google Fonts)**:
   - Pada panel tema, pilih jenis font yang paling nyaman untuk dibaca:
     - **Inter** (Default): Seimbang, tajam, dan sangat mudah dibaca di layar kerja.
     - **Plus Jakarta Sans**: Tipografi geometris modern bergaya enterprise SaaS.
     - **Outfit**: Sans-serif kontemporer dengan kurva visual halus berkelas.
     - **Poppins**: Rounded energik yang ramah dan nyaman dipindai mata.
     - **Roboto**: Presisi tinggi dengan keterbacaan data yang rapat dan rapi.
   - Pilihan tema dan font Anda otomatis disimpan di penyimpanan lokal peramban (*localStorage*) dan langsung aktif saat membuka halaman berikutnya tanpa kedipan layar (*Anti-FOUC*).

### 1.4 Keamanan Sesi, Peringatan 5 Menit & Auto-Logout Inaktivitas 1 Jam
Untuk melindungi kerahasiaan data proyek dan jam kerja dari akses tanpa izin pada perangkat yang ditinggalkan:
- **Deteksi Inaktivitas Cerdas (`session-manager.js`)**: Sistem secara konstan mendeteksi interaksi pengguna (pergerakan mouse, ketikan keyboard, scroll layar, dan sentuhan).
- **Peringatan 5 Menit Sebelum Logout**: Jika tidak terdeteksi aktivitas selama **55 menit**, sebuah dialog modal peringatan akan muncul di tengah layar menampilkan hitung mundur waktu tersisa (300 detik) dan tombol **"Lanjutkan Sesi"**.
- **Perpanjangan Sesi**: Cukup gerakkan kursor atau klik tombol "Lanjutkan Sesi", timer inaktivitas akan di-reset kembali ke awal (60 menit).
- **Auto-Logout Otomatis**: Jika pengguna tetap tidak merespons hingga menit ke-60, sesi kerja akan dikunci secara otomatis demi keamanan dan diarahkan ke halaman login dengan informasi sesi berakhir.

### 1.5 Prosedur Pengaturan Ulang Kata Sandi (Reset Password & User Claim Link)
Jika Anda lupa kata sandi akun TrackerKerja, sistem menyediakan mekanisme pemulihan mandiri yang aman:
1. **Mengakses Formulir Lupa Kata Sandi**:
   - Pada halaman login (`/Account/Login`), klik tautan **"Lupa Kata Sandi?"** di sebelah kanan label Kata Sandi.
   - Masukkan alamat email akun Anda yang terdaftar, lalu klik tombol **"Lanjutkan Reset Kata Sandi"**.
2. **Kondisi 1: Server Email (SMTP) Sudah Dikonfigurasi**:
   - Sistem akan secara otomatis mengirimkan pesan email resmi berisi tautan aman untuk menyetel kata sandi baru.
   - Buka pesan email Anda dan klik tombol **"Reset Kata Sandi Sekarang"**.
3. **Kondisi 2: Server Email (SMTP) Belum Disetting (User Claim Link)**:
   - Jika pengaturan SMTP email belum aktif atau belum diisi oleh Administrator, sistem secara cerdas mengalihkan ke mode **Tautan Klaim Pengguna (User Claim Link)**.
   - Layar akan menampilkan kotak **Secure Claim URL** lengkap dengan tombol **"Salin Tautan"** dan tombol langsung **"Buka Formulir Reset Kata Sandi Sekarang"**.
4. **Formulir Kata Sandi Baru & Aturan Re-Entry**:
   - Masukkan kata sandi baru (minimal 6 karakter) dan ulangi kata sandi pada kolom konfirmasi (*re-entry*).
   - Klik **Simpan Kata Sandi Baru**. Setelah berhasil, Anda dapat langsung masuk menggunakan kata sandi baru tersebut.
5. **Kebijakan Keamanan & Proteksi Penguncian Akun (Lockout Policy)**:
   - **Batas Kedaluwarsa 15 Menit**: Tautan reset kata sandi hanya berlaku selama **15 menit** demi mencegah penyalahgunaan token lama.
   - **Proteksi Salah Re-Entry (3 Kali Gagal)**: Jika konfirmasi kata sandi salah dimasukkan sebanyak **3 kali berturut-turut** atau jika tautan yang digunakan telah **kedaluwarsa**, akun pengguna akan secara otomatis **DIKUNCI selama 30 menit**.
   - Selama masa penguncian, akun tidak dapat digunakan untuk login maupun meminta reset ulang.
   - **Pembukaan Kunci oleh Administrator**: Jika akun terkunci, Administrator dapat membuka kunci akun secara instan melalui menu **Anggota Tim (`/Member`)** dengan tombol **Reset Password / Buka Kunci**.

---

## 2. Dashboard & Ringkasan Kinerja

Halaman Dashboard merupakan pusat informasi terpadu yang menyajikan ikhtisar aktivitas dan produktivitas Anda.

### 2.1 Kartu Metrik & Statistik Pribadi
- **Total Tugas**: Menampilkan jumlah seluruh tugas yang ditugaskan kepada Anda.
- **Tugas Sedang Dikerjakan (In Progress)**: Jumlah tugas yang saat ini aktif dalam proses pengerjaan.
- **Tugas Selesai (Done)**: Jumlah tugas yang telah tuntas dikerjakan.
- **Jam Kerja Hari Ini**: Akumulasi durasi waktu kerja yang telah Anda catat pada hari ini.
- **Kartu Daily Check-In & Streak**:
  - Menampilkan hitungan hari beruntun (*streak flame* 🔥) serta status apakah Anda telah melakukan check-in hari ini.
  - **Jika Belum Check-In**: Kartu menyorot status *Belum Check-In Hari Ini* dengan tombol aksi langsung **Check-In Sekarang (+10 Poin)** tanpa perlu berpindah halaman (*1-click AJAX check-in*).
  - **Jika Sudah Check-In**: Kartu menampilkan status *Sudah Check-In Hari Ini* beserta ringkasan progres target 30 hari menuju milestone hadiah bulanan.
- **Widget Spanduk Pengingat Check-In (Check-In Requirement Banner)**:
  - Spanduk cerdas beranimasi di bawah salam sambutan yang mengingatkan Anda bahwa check-in harian wajib dilakukan agar streak tidak terputus (peringatan toleransi 2 hari sebelum reset).
  - Dilengkapi ringkasan saldo poin tersedia dan tombol instan klaim poin.

### 2.2 Pemberitahuan & Notifikasi Lonceng
Klik ikon **Lonceng Notifikasi** pada bilah atas untuk melihat panel pemberitahuan cerdas:
- **Tab Semua**: Seluruh pemberitahuan sistem.
- **Tab Overdue**: Tugas-tugas yang telah melewati tenggat waktu agar segera diselesaikan.
- **Tab Mendekati Deadline**: Tugas yang memiliki batas waktu dalam 2–3 hari ke depan.
- **Tab Timesheet (Pengingat Cut-Off)**: Menampilkan daftar tugas aktif yang belum memiliki catatan jam kerja (*timesheet*), terutama saat mendekati periode cut-off bulanan tanggal 25.

### 2.3 Distribusi Tugas & Beban Kerja Proyek
Menampilkan diagram lingkaran (*doughnut chart*) dan grafik batang interaktif untuk melihat sebaran tugas per proyek, persentase penyelesaian, serta ringkasan aktivitas terbaru tim.

---

## 3. Modul Task (Manajemen Tugas Kerja)

Modul Tugas adalah inti pengelolaan pekerjaan sehari-hari.

### 3.1 Membuat Tugas Baru
1. Klik tombol **+ Tugas Baru** pada bilah atas atau di halaman Daftar Tugas (`/Task`).
2. Isi formulir pembuatan tugas:
   - **Judul Tugas**: Nama ringkas aktivitas pekerjaan (contoh: *Pembuatan Dokumen FSD Integrasi API*).
   - **Kode Tugas (Task Code)**: Dihasilkan otomatis oleh sistem (contoh: `TSK-0732`).
   - **Proyek**: Pilih proyek yang menaungi tugas ini.
   - **Kategori**: Pilih kategori kerja (misal: *System Analysis*, *Frontend*, *Backend*, *Quality Assurance*, dll).
   - **Tingkat Prioritas**: Pilih *Low*, *Medium*, *High*, atau *Critical*.
   - **Milestone SDLC**: Pilih tahapan siklus kerja (misal: *Requirement Analysis*, *System Design*, *Implementation*, *Testing & QA*, *Deployment*, *Maintenance*).
   - **Penanggung Jawab (PIC / Assigned To)**: Tentukan anggota tim yang bertugas.
   - **Tanggal Mulai & Tenggat Waktu (Due Date)**: Tentukan batas waktu pengerjaan.
   - **Deskripsi Detail**: Uraikan ruang lingkup dan instruksi tugas.
3. Klik tombol **Simpan Tugas**.

### 3.2 Daftar Tugas & Filter Pencarian Cepat
Pada halaman `/Task`, Anda dapat memfilter tugas berdasarkan:
- Pencarian kata kunci pada judul atau kode tugas.
- Filter berdasarkan **Proyek**.
- Filter berdasarkan **Status** (*Todo*, *In Progress*, *Done*).
- Filter berdasarkan **Prioritas** dan **Penanggung Jawab (PIC)**.
- Opsi sorting berdasarkan tanggal terbaru, prioritas tertinggi, atau tenggat waktu terdekat.

### 3.3 Memperbarui Status & Slider Kemajuan (0–100%)
Setiap tugas dilengkapi dengan slider persentase kemajuan (*progress bar*):
- Menggeser progress ke angka **1–99%** secara otomatis mengubah status tugas menjadi **In Progress**.
- Menggeser progress ke angka **100%** secara otomatis mengubah status tugas menjadi **Done (Selesai)**.
- Sebaliknya, mengubah status langsung ke *Done* akan otomatis mengisi progress menjadi 100%.

### 3.4 Sub-Task & Pencarian Tugas Induk (Parent Task) via Select2
Untuk memecah tugas besar menjadi bagian-bagian terukur atau menghubungkan tugas baru ke induknya:
1. **Pemilihan Tugas Induk Berbasis Select2**:
   - Pada halaman **Buat Tugas Baru** (`/Task/Create`) dan **Ubah Tugas** (`/Task/Edit/{id}`), bidang **Tugas Induk (Parent Task)** dilengkapi komponen pencarian bertenaga **Select2**.
   - Anda tidak perlu menggulir daftar ratusan tugas; cukup **ketikkan kata kunci nama tugas atau kode proyek**, dan sistem langsung memfilter pilihan tugas yang relevan secara real-time.
2. **Menambahkan Sub-Task dari Detail Tugas**:
   - Buka detail tugas utama (tugas induk / *parent task*).
   - Pada bagian **Sub-Tasks**, klik **Tambah Sub-Task**.
   - Masukkan judul, prioritas, dan PIC sub-task.
3. Kemajuan (*progress bar*) tugas induk akan mencerminkan rata-rata penyelesaian seluruh sub-task di bawahnya secara proporsional.

### 3.5 Mencatat Kendala (Obstacle) & Solusi Teknis
Fitur ini sangat berguna untuk mencatat hambatan (*blocker*) selama pengerjaan:
1. Buka form Edit Tugas atau Detail Tugas.
2. Isi kolom **Kendala / Hambatan (Obstacle)** (contoh: *Menunggu akses credential database server development*).
3. Isi kolom **Solusi / Tindak Lanjut (Solution)** (contoh: *Koordinasi dengan tim IT Infra via tiket permintaan akses*).
4. Catatan kendala dan solusi akan tampil dengan kartu informasi khusus berwarna peringatan agar mudah ditinjau saat rapat berkala.

### 3.6 Papan Kanban Interaktif (Geser & Letakkan)
Buka menu **Kanban** (`/Kanban`) untuk visualisasi alur kerja bergaya kartu:
- Tiga kolom utama: **To Do (Belum Dimulai)**, **In Progress (Sedang Dikerjakan)**, dan **Done (Selesai)**.
- **Drag & Drop**: Cukup klik dan tahan kartu tugas, lalu geser ke kolom status yang diinginkan. Status tugas di database akan otomatis diperbarui.
- **Tampilan Mobile**: Pada layar ponsel, tersedia tombol tab pintar di bagian atas untuk berpindah antar kolom secara cepat dan rapi.

### 3.7 Import Data Tugas dari Excel (Format Standar & Format ARMS)
Aplikasi mendukung impor banyak tugas sekaligus melalui berkas spreadsheet Excel `.xlsx` menggunakan dua standar format:
1. **Format Standar (9 Kolom)**: Sangat cocok untuk migrasi cepat daftar backlog tugas, dilengkapi wizard preview interaktif dan tombol penugasan massal (*Bulk Assign* PIC).
2. **Format ARMS Enterprise (21 Kolom)**: Format terstruktur enterprise yang memetakan kode tugas, modul, prioritas, status, PIC penugasan, stakeholder, kendala (*obstacle*), solusi (*solution*), catatan, serta tahapan siklus Waterfall SDLC Milestone.
3. **Cara Melakukan Impor**:
   - Buka menu **Import Task** (`/Import`).
   - Unduh template Excel yang diinginkan (*Template 9-Kolom* atau *Template ARMS 21-Kolom*).
   - Unggah berkas yang telah diisi, tinjau tabel pratinjau data, lalu klik **Konfirmasi Import Task**.

### 3.8 Penyatuan Formulir Edit Tugas & Pengisian Jam Kerja Manual (Satu Tombol Simpan)
Untuk mempercepat alur kerja harian pengembang dan analis sistem:
- Pada halaman **Ubah Tugas** (`/Task/Edit/{id}`), selain memperbarui rincian tugas (judul, status, progress, kendala, solusi), formulir kini menyediakan seksi terintegrasi **Catat Jam Kerja Sesi Ini (Manual Timesheet)**.
- Anda dapat langsung mengisi:
  - **Durasi Jam & Menit**: Misal *2 Jam 30 Menit*.
  - **Tanggal Sesi Kerja**: Tanggal saat pekerjaan dilakukan (default: hari ini).
  - **Catatan Aktivitas Sesi**: Rincian teknis pekerjaan yang baru saja diselesaikan.
- **Tombol Aksi Tunggal ("Simpan Perubahan & Sesi Kerja Manual")**:
  - Cukup satu kali klik, sistem secara atomik akan memperbarui informasi tugas di tabel `WorkTasks` dan sekaligus membuat entri log sesi kerja baru di tabel `WorkSessions`.
  - Anda tidak perlu lagi berpindah bolak-balik antara menu Tugas dan menu Timesheet terpisah.

---

## 4. Modul Project (Manajemen Proyek, Finansial & Alokasi Massal Tugas)

### 4.1 Membuat & Mengelola Proyek (Client, PM, Budget & Actual Cost)
1. Buka menu **Proyek** (`/Project`).
2. Klik tombol **+ Proyek Baru**.
3. Isi formulir manajemen proyek lengkap:
   - **Nama Proyek**: Nama inisiatif atau deliverable sistem (contoh: *Integrasi TCES - TCIS Enterprise*).
   - **Nama Klien / Stakeholder**: Identitas klien pemilik proyek (contoh: *PT Telekomunikasi Indonesia*).
   - **Project Manager (PM)**: Pilih penanggung jawab utama proyek dari daftar anggota tim.
   - **Pagu Anggaran (Budget)**: Nilai total dana anggaran yang dialokasikan (dalam Rupiah).
   - **Biaya Aktual (Actual Cost)**: Nilai realisasi pengeluaran berjalan untuk proyek tersebut.
   - **Warna Identitas Proyek**: Palet warna unik yang digunakan sebagai penanda badge pada kartu tugas dan kalender.
   - **Batas Akhir Proyek (Deadline)**: Tanggal target penyelesaian deliverable.
   - **Deskripsi Proyek**: Ruang lingkup, arsitektur garis besar, atau catatan kerja sama.
4. Klik **Simpan Proyek**.

### 4.2 Analitik Finansial, Indikator Burn Rate & Linimasa Proyek
- **Visualisasi Financial Burn Rate (Serapan Biaya)**:
  - Setiap kartu proyek menampilkan persentase serapan biaya terhadap pagu anggaran:
    $$\text{Burn Rate} = \frac{\text{Actual Cost}}{\text{Budget}} \times 100\%$$
  - Dilengkapi indikator badge warna cerdas:
    - **Hijau (< 80%)**: Pengeluaran aman dan terkendali.
    - **Kuning / Amber (80% – 100%)**: Serapan biaya mendekati pagu anggaran maksimum.
    - **Merah / Rose (> 100%)**: Peringatan keras *Overbudget* (pengeluaran melebihi anggaran yang disepakati).
- **Standarisasi Tata Letak Lebar (Wide Layout)**:
  - Tampilan direktori proyek dan detail proyek dirancang mengikuti standar tata letak layar lebar (*full-width responsive layout*) serasi dengan modul Kalender dan Presensi.
- **Linimasa & Progres Tugas**:
  - Kartu proyek menampilkan rasio tugas selesai vs total tugas, rata-rata progres persentase, total durasi jam kerja tim, serta nama Project Manager yang memimpin.

### 4.3 Alokasi Massal Tugas ke Proyek (Bulk Task Assignment)
Untuk menghemat waktu saat merapikan tugas-tugas lepas ke dalam sebuah proyek:
1. Buka halaman detail proyek yang bersangkutan (`/Project/Details/{id}`).
2. Pada panel daftar tugas proyek, klik tombol **+ Alokasikan Tugas Massal**.
3. Jendela modal interaktif akan menampilkan daftar seluruh tugas aktif di perusahaan Anda yang **belum terikat pada proyek manapun**.
4. Beri tanda centang pada tugas-tugas yang ingin dimasukkan ke proyek ini (tersedia fitur pencarian cepat di dalam modal).
5. Klik tombol **Tugaskan ke Proyek**. Seluruh tugas terpilih akan otomatis terasosiasi dengan proyek tersebut dalam satu kali klik.

---

## 5. Modul Timesheet & Pelacakan Jam Kerja

Modul Timesheet mencatat waktu aktual yang dihabiskan untuk menyelesaikan setiap tugas secara transparan dan akurat.

### 5.1 Pencatatan Jam Otomatis (Live Timer / Clock In & Clock Out)
1. Buka menu **Timesheet** atau buka kartu tugas apa saja.
2. Klik tombol **Mulai Timer (Clock In)** berwarna hijau pada tugas yang akan dikerjakan.
3. Timer akan berjalan secara *real-time*. Durasi waktu yang berjalan dapat dilihat di panel samping maupun di bagian atas layar.
4. Setelah selesai bekerja, klik tombol **Hentikan Timer (Clock Out)** berwarna merah.
5. Anda dapat menambahkan catatan ringkas mengenai pekerjaan yang telah diselesaikan pada sesi tersebut.

### 5.2 Penggunaan Multi-Timer Bersamaan
Aplikasi mendukung **Multi-Timer Aktif** per pengguna:
- Jika Anda sedang mengerjakan tugas analisis sekaligus melakukan pemantauan deployment tugas lain, Anda dapat menjalankan timer untuk masing-masing tugas tersebut.
- Seluruh timer yang aktif akan tercatat secara independen dan dapat dihentikan satu per satu.

### 5.3 Pencatatan Jam Kerja Manual
Jika Anda lupa menyalakan timer saat bekerja:
1. Buka menu **Timesheet** (`/Timesheet`).
2. Klik tombol **+ Tambah Jam Kerja Manual**.
3. Pilih **Tugas**, **Tanggal Kerja**, **Jam Mulai**, **Jam Selesai**, serta isi **Catatan Aktivitas**.
4. Klik **Simpan Sesi**.

### 5.4 Notifikasi Pengingat Pengisian Timesheet (Cut-Off Tanggal 25)
- **Periode Cut-Off**: Jatuh pada **tanggal 25 setiap bulannya**.
- **Jendela Pengingat**: Mulai tanggal **18 hingga 25 setiap bulan**, sistem otomatis memindai seluruh tugas aktif yang ditugaskan kepada Anda namun **belum memiliki catatan jam kerja (0 jam)**.
- **Pemberitahuan**: Lonceng notifikasi pada topbar dan banner peringatan di halaman Timesheet akan menyala, menampilkan daftar tugas yang belum diisi jam kerjanya.

### 5.5 Export Laporan Excel Timesheet Resmi (Format Standar Elistec)
1. Buka menu **Timesheet** (`/Timesheet`).
2. Klik tombol **Export Timesheet Personal (Excel)**.
3. Pilih rentang tanggal (tersedia preset *Bulan Ini*, *Bulan Lalu*, *Minggu Ini*, atau rentang tanggal kustom).
4. Klik **Download Excel**.
- Format laporan mencakup konversi otomatis ke *Man-Days (MD)*, penandaan hari libur nasional, akhir pekan, dan formula kalkulasi grand total otomatis.

---

## 6. Modul Absensi & Presensi Kerja (Attendance)

Modul Presensi (`/Attendance`) memudahkan pencatatan kehadiran kerja harian seluruh anggota tim:

### 6.1 Pencatatan Check-In & Check-Out Harian
1. Buka menu **Absensi** pada bilah navigasi.
2. Klik tombol **Check In** saat memulai hari kerja. Waktu masuk akan tercatat secara presisi.
3. Klik tombol **Check Out** saat mengakhiri hari kerja untuk menyelesaikan durasi kerja harian.

### 6.2 Status Kehadiran Fleksibel
Pengguna dapat memilih status kehadiran sesuai kondisi kerja:
- **Hadir (WFO)**: Bekerja di kantor.
- **WFH (Work From Home)**: Bekerja dari rumah / jarak jauh.
- **Sakit**: Kehadiran izin sakit.
- **Izin / Cuti**: Mengambil jatah cuti atau izin keperluan pribadi.
- **Libur**: Hari libur resmi.

### 6.3 Monitoring Rekapitulasi Presensi Tim
- Administrator dapat melihat rekapitulasi kehadiran seluruh anggota tim dalam format tabel bulanan yang rapi.
- Membantu bagian operasional dan manajemen dalam memverifikasi kedisiplinan dan ketersediaan tim.

---

## 7. Modul Kalender Kerja & Jadwal (Calendar)

Buka menu **Kalender** (`/Calendar`) untuk visualisasi jadwal tugas dan deadline interaktif:

### 7.1 Tampilan Kalender Berbasis Peran (RBAC Filter)
- **Member Reguler**: Kalender secara otomatis menyaring dan **hanya menampilkan tugas milik member yang sedang login** (*Tugas Saya*). Terdapat penanda badge *👤 Tugas Saya* di bagian atas.
- **Pilihan Tampilan**: Mendukung tampilan Bulanan (*Month*), Mingguan (*Week*), Harian (*Day*), dan Daftar Agenda (*List View*).

### 7.2 Fitur Khusus Administrator
- Pengguna dengan peran **Administrator** memiliki dropdown filter di header kalender:
  - **🌐 Semua Tugas Tim**: Menampilkan persebaran seluruh tugas dari semua anggota tim.
  - **👤 Tugas Saya Sendiri**: Menyaring kalender agar hanya menampilkan tugas yang ditugaskan ke Admin.
- Mengubah pilihan dropdown akan langsung memperbarui kalender (*AJAX refetch*) tanpa me-refresh seluruh halaman.

### 7.3 Deteksi Irisan Jadwal & Detail PIC
- **Peringatan Irisan (Overlap Warning)**: Sistem otomatis mendeteksi jika terdapat tugas-tugas yang memiliki rentang tanggal yang berbenturan dan menampilkan banner peringatan.
- **Task Detail Modal & Tooltip**: Mengklik salah satu event pada kalender akan membuka popup modal yang menampilkan informasi lengkap: Judul, Status, Prioritas, Proyek, Deadline, serta **Nama & Avatar PIC (Penanggung Jawab)**.

---

## 8. Modul Catatan Kerja & Dokumentasi (Notes)

Modul Catatan (`/Note`) berfungsi sebagai repositori dokumentasi teknis, notula rapat, dan referensi harian.

### 8.1 Membuat Catatan dengan Rich-Text Editor
1. Buka menu **Catatan** dan klik **+ Buat Catatan Baru**.
2. Masukkan **Judul Catatan**.
3. Gunakan editor (*Quill.js Rich-Text*) untuk teks berformat, heading, tabel, dan blok kode.
4. Pilih warna kartu catatan untuk mempermudah identifikasi visual.

### 8.2 Menyematkan Catatan Penting (Pin Note)
- Klik ikon pin pada kartu catatan agar catatan tersebut selalu berada di posisi paling atas halaman.

### 8.3 Menghubungkan Catatan ke Tugas atau Proyek
- Anda dapat mengaitkan catatan dengan tugas atau proyek tertentu agar otomatis tampil pada tab dokumentasi tugas/proyek tersebut.

### 8.4 Mengunggah Berkas Lampiran
- Lampirkan berkas dokumen (PDF, Word, Excel, gambar) ke dalam catatan. Berkas tersimpan rapi dan dapat diunduh kapan saja.

---

## 9. Modul JSON Payload Tools

Modul JSON Tools (`/JsonTools`) disediakan khusus untuk System Analyst, Developer, dan QA dalam mengolah data payload JSON saat pengujian integrasi API.

### 9.1 Merapikan Format JSON (Beautify)
- Tempel teks JSON ke dalam editor dan klik **Format JSON** untuk merapikan indentasi baris secara terstruktur.

### 9.2 Validasi Sintaks & Minify JSON
- **Validasi**: Mendeteksi kesalahan penulisan kurung, koma, kutip, atau struktur data JSON.
- **Minify**: Menghapus whitespace berlebih untuk menghasilkan payload ringkas siap pakai.

### 9.3 Penyimpanan Template Payload Pengujian
- Simpan snippet JSON pengujian yang sering digunakan ke dalam daftar template untuk dimuat ulang secara instan.

---

## 10. Modul SQL Beautifier & Formatter Tools

Modul SQL Beautifier (`/SqlTools`) dirancang untuk merapikan, memformat, memvalidasi, dan mengompres kueri SQL dengan standar engine database modern.

### 10.1 Format & Beautify 15+ Dialek SQL Engine
- Mendukung dialek SQL: Standard ANSI, PostgreSQL, MySQL, MariaDB, SQLite, Transact-SQL (SQL Server), Oracle (PL/SQL), BigQuery, Snowflake, Redshift, Spark SQL, DB2, Trino, Couchbase, dan SingleStore.
- Kustomisasi indentasi (2/4/8 spasi atau Tab) dan pengubahan kata kunci keyword menjadi `UPPERCASE` atau `lowercase`.
- Shortcut cepat: Tekan **Ctrl + Enter** untuk memformat kueri secara instan.

### 10.2 Validasi Sintaks & Minifikasi Kueri
- Memeriksa keseimbangan tanda kurung dan kutip secara otomatis.
- Menghapus komentar dan whitespace berlebih untuk kompresi kueri (*Minify*).

### 10.3 Penyimpanan Snippet Kueri SQL Terkait Tugas
- Simpan kueri ke database lokal dan hubungkan ke tugas kerja tertentu untuk dokumentasi tim.

---

## 11. Modul Laporan & Analitik Kinerja

Buka menu **Laporan** (`/Report`) untuk evaluasi produktivitas:
- **Grafik Distribusi Jam Kerja**: Rekapitulasi perbandingan total jam kerja per proyek.
- **Matriks Beban Kerja Tim (Workload Matrix)**: Memantau jumlah tugas aktif per anggota tim.
- **Linimasa Gantt**: Menampilkan urutan pengerjaan tugas dalam bentuk diagram batang linimasa.
- **Ekspor Laporan**: Fasilitas ekspor data rekapitulasi ke format Excel.

---

## 12. Modul Anggota Tim (Member), Grouping Perusahaan Admin, Pure Grid Card & Banner Cover

Buka menu **Anggota Tim** (`/Member`):
- **Pengelompokan Berdasarkan Nama Perusahaan (Khusus Login Administrator)**:
  - Saat Anda masuk sebagai **Administrator Sistem**, direktori anggota secara cerdas dikelompokkan (*grouped*) berdasarkan nama perusahaan masing-masing anggota.
  - Setiap grup entitas perusahaan memiliki kartu header tersendiri dengan:
    1. Ikon perusahaan.
    2. Nama Perusahaan dan badge Kode Perusahaan unik (misal: `[ELISTEC]`, `[ACME]`).
    3. Counter total personel yang tergabung dalam perusahaan tersebut.
    4. Indikator mini KPI teragregasi (rasio tugas terselesaikan vs total tugas, serta akumulasi total jam kerja tim).
  - *Untuk Member Biasa*: Tampilan tetap rapi dalam format grid terisolasi khusus untuk rekan tim di perusahaan Anda sendiri.
- **Komponen Kartu Anggota Modular (`_MemberCard.cshtml`)**:
  - Profil setiap anggota disajikan melalui kartu modular modern dengan avatar inisial berwarna, badge nama & email terproteksi anti-overflow (teks panjang dipotong rapi dengan tooltip *hover*), role badge, ringkasan jam kerja, rasio tugas selesai, dan tombol aksi detail.
- **Kustomisasi Banner Cover Profil Karyawan**:
  - Setiap pengguna dapat mempercantik tampilan profilnya melalui menu **Profil Akun** (`/Account/Profile`).
  - Unggah berkas gambar foto sampul (*Cover Banner*) dengan format JPG/PNG/WebP.
  - Tersedia opsi untuk menghapus cover kustom dan kembali ke banner vektor SVG default (`default-profile-cover.svg`).
- **Badge Prestasi & Gamifikasi**:
  - Anggota tim dapat meraih lencana prestasi (*badges*) otomatis berdasarkan produktivitas kerja dan pencapaian milestone.
- **Admin Direct Password Reset**:
  - Administrator dapat mereset kata sandi akun anggota secara langsung melalui antarmuka kartu anggota tanpa menunggu proses pemulihan email.
- **Hapus Permanen Akun (*Permanent User Deletion*)**:
  - Disediakan khusus bagi peran **Administrator** untuk membersihkan akun uji coba atau akun yang sudah tidak relevan.
  - **Mekanisme Proteksi Ganda (Double Verification)**:
    1. Klik tombol merah **Hapus Permanen** pada kartu atau detail anggota.
    2. Jendela modal konfirmasi keamanan akan terbuka dan mewajibkan Admin mengetikkan nama lengkap pengguna target secara persis.
    3. Masukkan kata sandi Administrator untuk mengesahkan tindakan.
    4. Sistem akan menghapus rekaman pengguna dari basis data ASP.NET Identity secara aman dan membebaskan penugasan tugas yang terkait.

---

## 13. Modul Master Data, Konfigurasi 4-Tab, Sinkronisasi Multi-Instance & Backup

Khusus untuk peran **Administrator**, menu **Master Data** (`/MasterData`) dan **Konfigurasi** (`/Configuration`):

### 13.1 Arsitektur Konfigurasi Sistem 4-Tab Modular
Halaman **Konfigurasi Sistem (`/Configuration`)** dirancang dengan tata kelola 4 Tab navigasi terpadu yang memisahkan ranah konfigurasi dan pemeliharaan teknis secara teratur:
1. **Tab 1: Sinkronisasi Host Induk & Cabang (`tab-cfg-sync`)**:
   - Pengaturan alamat host induk (`HostIndukUrl`), validasi API Key / Bearer Token, sakelar bypass SSL (*Allow Untrusted SSL*), dan tombol aksi *Push Sync*, *Pull Sync* beserta riwayat transaksi sinkronisasi.
2. **Tab 2: Database & Pemeliharaan (`tab-cfg-database`)**:
   - Metrik kapasitas basis data SQLite (ukuran file fisik, total halaman, mode WAL).
   - Tindakan pemeliharaan: Kompresi VACUUM (*Shrink Database*), pencadangan biner `.db`, serta ekspor dan impor skrip transaksi `.sql`.
3. **Tab 3: Server Email & Notifikasi (`tab-cfg-email`)**:
   - Konfigurasi server SMTP (Host, Port, SSL/TLS, Kredensial Pengirim), alat uji coba koneksi mandiri dengan pengukuran latensi milidetik (*latency ms*), dan editor template email event berbasis WYSIWYG lengkap dengan live preview.
4. **Tab 4: Umum & Swagger API (`tab-cfg-general`)**:
   - Konfigurasi alamat `GlobalBaseUrl`, ringkasan spesifikasi runtime sistem, serta tombol pintasan ke dokumentasi Swagger RESTful API interaktif.
- *Catatan Desain*: Tab personalisasi tema ditiadakan dari halaman ini karena fitur penyesuaian 40 tema warna dan 5 jenis Google Fonts kini telah dapat diakses langsung dari bilah atas (Topbar) di seluruh halaman aplikasi.

### 13.2 Master Kategori, Prioritas, dan Status
- Mengelola kategori tugas, prioritas (*Critical, High, Medium, Low*), dan status alur kerja.

### 13.3 Master Milestone SDLC Waterfall
- Mengatur tahapan siklus pengembangan perangkat lunak (Requirement, Design, Development, Testing, Deployment).

### 13.4 Master Hari Libur Nasional
- Mengelola daftar hari libur resmi yang terintegrasi otomatis dengan laporan Timesheet Excel.

### 13.5 Sinkronisasi Multi-Instance ke Host Induk (Online Streaming Base64 & Paket ZIP)
Fitur ini memungkinkan instance lokal atau laptop cabang melakukan sinkronisasi data pekerjaan dan seluruh berkas lampiran ke atau dari Server Host Induk terpusat:
- **1. Online Push Sync (Kirim ke Host)**:
  - Masukkan URL Host Induk (contoh: `https://host-tracker.perusahaan.com`) dan **API Secret Key** (`X-Sync-Key`) atau token JWT Bearer.
  - Aktifkan tombol toggle **"Sertakan Berkas Uploads & Lampiran"** agar seluruh berkas lampiran catatan (`uploads/notes/*`), avatar profil (`uploads/avatars/*`), dan banner sampul (`uploads/covers/*`) ikut dikemas (Base64 streaming) dan dikirimkan ke server induk.
  - Klik **"Test Koneksi"** untuk memverifikasi kesiapan host dan melihat statistik data/file di server tujuan.
  - Klik **"Mulai Push Sync ke Host"** untuk menjalankan sinkronisasi data dan berkas secara otomatis.
- **2. Online Pull Sync (Tarik dari Host)**:
  - Digunakan pada server child untuk menarik pembaruan tugas dan lampiran terbaru dari server induk.
  - Klik tombol **"Tarik Data dari Host (Pull Sync)"**.
- **3. Ekspor Paket Lengkap (.zip Offline)**:
  - Klik tombol **"Unduh Paket Sinkronisasi (.zip)"** pada tab *Ekspor Paket*.
  - Menghasilkan file `.zip` terstruktur berisi `manifest.json`, `sync_data.sql` DML terurut, dan seluruh folder berkas `uploads/` (catatan, avatar, cover).
- **4. Impor Paket (.zip / .sql)**:
  - Buka tab *Impor Data / Paket*, lalu unggah file `.zip` (Full Package) atau `.sql` (Dump SQL).
  - Sistem akan mengekstrak berkas lampiran ke folder target secara aman serta mengeksekusi script transaksi database secara otomatis.

### 13.6 Backup & Restore Database (.db & .sql)
Fasilitas pencadangan dan pemulihan data instan untuk Administrator di menu **Konfigurasi Sistem (`/Configuration`)**:
1. **Pencadangan Data (Export / Backup)**:
   - **Export File Database (.db)**: Mengunduh berkas biner SQLite `.db` utuh untuk pencadangan offline (*full binary backup*).
   - **Export Script SQL (.sql)**: Mengunduh skrip DDL dan DML lengkap yang siap direstore ke database manapun.
   - **Kompresi Database (VACUUM)**: Mengoptimalkan dan mengklaim kembali ruang kosong file SQLite.
2. **Pemulihan Data (Restore Database)**:
   - Administrator dapat melakukan pemulihan (*restore*) database langsung melalui formulir upload pada tab konfigurasi.
   - Mendukung berkas **SQL Script (`.sql`)** untuk eksekusi script migrasi data secara atomik.
   - Mendukung berkas **SQLite Database (`.db`)** untuk pemulihan langsung database biner.
   - Terdapat konfirmasi pengamanan sebelum proses restore dieksekusi demi menjaga integritas data operasional.

### 13.7 Integrasi Server Email (SMTP), Diagnostik Koneksi & 7 Template Event
Modul ini memungkinkan sistem TrackerKerja mengirimkan email notifikasi otomatis kepada pengguna dan administrator untuk event-event krusial:
1. **Mengonfigurasi Server SMTP**:
   - Buka menu **Konfigurasi Sistem (`/Configuration`)**.
   - Pada tab **Server Email & Notifikasi**, masukkan parameter koneksi server email:
     - **Host SMTP / Mail Server**: Alamat host mail provider Anda (contoh: `smtp.gmail.com`, `smtp.office365.com`, atau `smtp.mailtrap.io`).
     - **Port SMTP**: Port koneksi (contoh: `587` untuk STARTTLS, `465` untuk SSL/TLS murni, atau `2525`).
     - **Email Pengirim**: Alamat email yang digunakan untuk mengirim pesan (contoh: `notifications@perusahaan.com`).
     - **Nama Pengirim**: Nama identitas pengirim email (contoh: `Work Tracker Notification Engine`).
     - **Kata Sandi Email (App Password)**: Password akun atau App Password khusus aplikasi. Kata sandi yang tersimpan akan disamarkan (`••••••••`).
     - **Aktifkan Enkripsi SSL / TLS**: Centang opsi ini untuk keamanan enkripsi data transmisi (sangat disarankan).
     - **Status Integrasi**: Pastikan sakelar aktif untuk mengizinkan sistem mengirimkan email secara otomatis.
   - Klik **Simpan Pengaturan SMTP**.

2. **Melakukan Uji Koneksi Email (Test Connection & Diagnostics)**:
   - Pada kartu **Uji Koneksi & Diagnostik SMTP**:
     - Masukkan alamat email tujuan pengujian pada kolom **Email Penerima Uji Coba**.
     - Klik tombol **Kirim Email Percobaan**.
     - Sistem akan melakukan *handshake* langsung ke server mail dan mengukur latensi pengiriman dalam milidetik (*latency ms*).
     - Hasil uji koneksi dan log diagnostik teknis (*Diagnostics Box*) akan ditampilkan langsung di layar (misal respon `250 OK` dan status enkripsi TLS).

3. **Manajemen Template Email Event & Live Preview**:
   - Sistem menyediakan sub-modul untuk mengatur format dan isi pesan email untuk 7 event bawaan:
     - *Autentikasi*: Registrasi akun, approval akun, penolakan registrasi, notifikasi reset password.
     - *Admin Alert*: Notifikasi instan pendaftaran pengguna baru kepada Administrator.
     - *Manajemen Tugas*: Penugasan PIC tugas baru dan perubahan status tugas.
   - Klik **Edit Template** untuk mengubah subjek, isi pesan HTML, atau menyisipkan chip placeholder variabel dinamis (`{FullName}`, `{TaskTitle}`, `{ProjectName}`, `{ActionUrl}`, dll.).
   - Klik **Pratinjau (Preview)** untuk melihat hasil render visual email secara real-time.

### 13.8 Audit Trail & Modal Detail Aktivitas
Setiap aksi penting (pembuatan, perubahan, penghapusan, login, logout, dsb.) tercatat secara otomatis di menu **Audit Trail (`/AuditTrail`)**:
- **Inspeksi Detail via Popup Modal**:
  - Pada tabel log audit, klik tombol **Lihat Detail** pada baris aktivitas yang diinginkan.
  - Sebuah popup modal elegan akan menampilkan informasi menyeluruh: waktu kejadian, user penanggung jawab, IP address, HTTP Method, URL request, Controller & Action, status HTTP (200, 400, 500), durasi eksekusi dalam milidetik, serta payload JSON/rincian perubahan data.

---

## 14. Modul Gamifikasi, Aturan Poin 15 & 30 Hari, Daily Check-In & Hadiah

Modul **Gamifikasi** (`/Gamification`) hadir untuk mendorong kedisiplinan dan produktivitas tim melalui pendekatan berbasis penghargaan (*gamified reward system*).

### 14.1 Saldo Awal Bulanan (0), Aturan Poin 15/30 Hari & Aturan Streak (Reset 2 Hari)
1. **Ketentuan Saldo Bulanan & Akumulasi Poin (Aturan 15 & 30 Hari)**:
   - **Saldo Poin Dimulai dari 0**: Pada awal setiap bulan kalender baru, saldo poin akumulasi check-in seluruh pengguna **dimulai kembali dari 0** guna menciptakan kompetisi yang segar dan menjaga komitmen disiplin kerja yang konsisten.
   - **Aturan Perolehan Poin Check-In**:
     - **Pencapaian 15 Hari**: Pengguna yang konsisten melakukan daily check-in selama 15 hari berhak memperoleh **1/2 (50%)** dari total akumulasi target poin check-in bulanan.
     - **Pencapaian 30 Hari (Penuh)**: Pengguna yang menyelesaikan daily check-in hingga 30 hari penuh berhak memperoleh **1x (100%)** total akumulasi poin bulanan secara utuh.
   - **Akumulasi Poin Lencana (Badge Points Aditif)**: Perolehan poin dari pencapaian lencana prestasi (*Master Badges*) bersifat aditif langsung dan **ditambahkan di atas** akumulasi saldo poin check-in bulanan Anda.

2. **Melakukan Check-In Harian**:
   - Buka menu **Daily Check-In & Hadiah** pada sidebar navigasi atau klik kartu metrik ke-5 di Dashboard utama.
   - Klik tombol **"Check-In Sekarang"** untuk mengklaim poin harian Anda (default: 10 Poin).
   - Pengguna hanya dapat melakukan check-in 1 kali per hari kalender.

3. **Aturan Streak Konsistensi & Reset 2 Hari**:
   - Jika Anda check-in setiap hari berturut-turut, hitungan **Streak** akan terus bertambah `+1` setiap hari.
   - **Aturan Reset 2 Hari**: Jika Anda tidak melakukan check-in selama **2 hari berturut-turut** (`gap >= 2 hari`), hitungan streak akan otomatis **kembali ke awal (Hari 1)**.
   - Indikator kobaran api (*streak flame counter*) dan roadmap visual hari 1–30 akan memperlihatkan status konsistensi Anda.

### 14.2 Milestone Bulanan (Streak 30 Hari) & Hadiah Spesial
- **Pencapaian 1 Bulan Penuh**: Pengguna yang berhasil mempertahankan streak hingga **30 hari berturut-turut (1 bulan)** akan membuka lencana pencapaian bulanan, memperoleh bonus poin besar (default: 500 Poin), serta berhak mengklaim reward berkategori **"Hadiah Khusus Streak 30 Hari"**.
- Setelah mencapai hari ke-30, roadmap akan memulai siklus bulan berikutnya dengan pencapaian yang tetap terekam dalam riwayat akun.

### 14.3 Koleksi 40+ Master Badge Gaul & Modern Anak Muda
Sistem menyediakan lebih dari 40 lencana prestasi dengan nama dan deskripsi berbahasa Indonesia gaya modern anak muda yang memotivasi:
- **Kategori Tugas (Tasks)**: *Awalan Nih Bos! 🐾*, *Sat-Set 10 Task ⚡*, *Si Paling Eksekutor ⚔️*, *Sepuh Produktif 100 🏆*, *Mulai Proyekan 📋*, *Juggling 25 Task 🗂️*, *Suhu Penugasan 🏗️*.
- **Kategori Waktu & Fokus (Timesheets)**: *Mode Fokus On 🔥*, *Kopi & Keringat ☕*, *Mulai Nyatet Waktu ⏱️*, *Jawara Timesheet ⏳*, *Speedrun Kerja 🚀*, *Dewa Waktu 🪐*.
- **Kategori Presensi (Attendance)**: *Hadir Bos! ⏰*, *Anti Mangkir Seminggu 📅*, *Sebulan No Bolos 🛡️*, *Duta Presensi 100 🌟*.
- **Kategori Dokumentasi (Notes)**: *Catet Biar Gak Lupa 📜*, *Gudang Catatan 🧠*, *Spill Daging 25 Info 📚*, *Kolektor Solusi 🏛️*.
- **Kategori Developer Tools**: *Format JSON Pertama 🧩*, *Pawang JSON 🔮*, *Sultan Payload JSON 🌐*, *Query Rapi Pertama 💾*, *Penyihir SQL 🧙‍♂️*, *Dewa Query SQL ⚡*.
- **Kategori Aktivitas & Work-Life Balance**: *Login Perdana 👋*, *Langganan Masuk 🔑*, *Member Garis Keras 🚪*, *Sultan Login 100 💎*, *Pamit Dulu Guys 🌇*, *Anti Lembur Club 🧘*, *Master Tenggo 50 🌅*.
- **Kategori Daily Check-In**: *Absen Poin Perdana 📅*, *On Fire 7 Hari 🔥*, *No Skip 14 Hari ⚡*, *Khatam Sebulan Penuh 🏆*, *Sultan Check-In 50 🎖️*.
- **Kategori Spesial**: *MVP Idola Kantor 🌟* (Pemberian manual dari Administrator).

### 14.4 Katalog Hadiah & Penukaran Poin (1 Poin = Rp 100)
1. **Sumber Poin Terbatas (Strict Balance)**:
   - Saldo poin yang dapat ditukarkan dihitung secara ketat hanya dari:
     $$\text{Saldo Poin} = (\text{Poin Badge} + \text{Poin Daily Check-In}) - \text{Poin Klaim yang Sedang/Sudah Diproses}$$
2. **Nilai Tukar Poin**:
   - Secara default: **1 Poin = Rp 100** (dapat disesuaikan oleh Admin pada Master Data).
   - Contoh: Hadiah bernilai 250 Poin setara dengan voucher Rp 25.000,-.
3. **Mengajukan Penukaran Hadiah**:
   - Pilih barang pada Katalog Hadiah, lalu klik tombol **Tukar Poin**.
   - Masukkan informasi pengiriman atau nomor kontak/e-wallet Anda.
   - Klik **Konfirmasi Penukaran**. Stok hadiah akan otomatis dipesan (*reserve*) dan saldo poin Anda akan diperbarui. Status klaim menjadi **Menunggu Review (Pending)**.

### 14.5 Manajemen Master Hadiah & Persetujuan Klaim (Admin Approval)
Khusus Administrator melalui menu **Master Data > Tab Poin & Hadiah (`/MasterData?tab=rewards`)**:
1. **Pengaturan Sistem Gamifikasi**:
   - Poin per Check-In (Default: 10 Poin).
   - Kurs Rupiah per Poin (Default: Rp 100).
   - Target Hari Streak Bulanan (Default: 30 Hari).
   - Bonus Poin Streak Bulanan (Default: 500 Poin).
   - Toleransi Hari Tanpa Check-in Sebelum Reset (Default: 2 Hari).
2. **Katalog Master Hadiah (CRUD)**:
   - Menambah, mengedit, dan menghapus item hadiah (Nama, Deskripsi, Biaya Poin, Stok, Kategori, Ikon FontAwesome, Warna, dan centang *Hadiah Khusus Streak 30 Hari*).
3. **Proses Pengajuan Klaim Pengguna**:
   - Meninjau daftar klaim masuk.
   - Klik tombol **Setujui (Approve)** jika klaim valid.
   - Klik tombol **Selesaikan (Completed)** setelah voucher/barang diserahkan ke pengguna.
   - Klik tombol **Tolak (Reject)** jika klaim tidak memenuhi syarat. Saat ditolak, sistem otomatis mengembalikan stok barang dan mengembalikan poin ke saldo pengguna.

---

## 15. Tata Letak Studio Bentang Penuh (Full-Width Responsive Studio Layout)

Mulai versi 3.8, Work Tracker Pro menghadirkan pengalaman visual baru dengan tata letak **Full-Width Responsive Studio Layout** pada lima halaman operasional utama. Tata letak ini menggantikan model formulir sempit terpusat lama menjadi kanvas studio profesional yang memaksimalkan area layar monitor lebar (*widescreen* / FHD / QHD) untuk kenyamanan bekerja multi-tasking.

### 15.1 Prinsip Kerja Kanvas Studio 2-Kolom & Bilah Aksi Bawah
Tata letak studio membagi ruang kerja menjadi dua area fungsional komplementer:
1. **Kanvas Utama Kiri (8 Kolom / Lebar ~66%)**:
   - Area terfokus untuk konten inti yang memerlukan ruang ketik dan pembacaan luas: Judul tugas, editor deskripsi dokumen, pencatatan kendala & solusi teknis, entri manual timesheet, dan manajemen sub-tugas.
2. **Bilah Pengawas Metadata Kanan (Sticky Metadata Inspector Sidebar - 4 Kolom / Lebar ~33%)**:
   - Berisi kartu-kartu atribut seperti pemilih Proyek, Assignee (PIC), Kategori, Prioritas, Status, Milestone, Slider Kemajuan, dan Pemilih Tanggal.
   - Bilah ini bersifat **mengambang lengket (*sticky*)** saat Anda menggulir halaman, sehingga Anda dapat mengubah status atau memeriksa deadline kapan saja tanpa harus menggulir ke atas kembali.
3. **Bilah Tombol Aksi Bawah Lengket (Sticky Bottom Action Bar)**:
   - Panel tombol aksi di bagian paling bawah layar dengan efek kaca (*backdrop-blur*) yang selalu melayang di atas footer.
   - Tombol **Simpan Perubahan**, **Kembali / Batal**, dan aksi utilitas sekunder selalu terlihat dan siap diklik secara instan.

### 15.2 Operasional Halaman Edit Tugas (`/Task/Edit`)
1. **Menyunting Konten & Kendala**:
   - Ketik atau perbarui deskripsi tugas pada kanvas kiri.
   - Jika menghadapi hambatan, isi kolom **Kendala (Obstacle)** dan **Solusi Teknis**.
2. **Pencatatan Jam Manual & Sub-Task**:
   - Pada kanvas kiri bawah, Anda dapat langsung menambahkan sesi jam kerja manual tanpa berpindah ke modul timesheet.
   - Tambahkan dan kelola daftar *sub-task* (anak tugas) secara hierarkis.
3. **Mengatur Metadata di Sisi Kanan**:
   - Ubah Status (Pending, In Progress, Review, Done) atau sesuaikan Slider Kemajuan (0–100%).
   - Tentukan tanggal mulai dan tenggat waktu (*Due Date*).
4. **Menyimpan**: Cukup klik tombol biru **Simpan Perubahan** pada bilah bawah lengket.

### 15.3 Operasional Halaman Edit Catatan (`/Note/Edit`)
1. **Penyusunan Catatan Dokumen**:
   - Kanvas kiri menyajikan editor catatan dokumen luas dengan format teks kaya (Rich-Text Editor) dan pengelola lampiran berkas multi-file.
2. **Panel Konfigurasi Kanan**:
   - Pilih palet warna visual kartu catatan (Putih, Biru, Hijau, Kuning, Merah, Ungu, dsb.).
   - Atur Kategori Catatan dan aktifkan sakelar **Sematkan Catatan (Pin Note)** agar catatan selalu berada di urutan teratas.
   - Hubungkan catatan ke tugas kerja tertentu melalui dropdown pencarian tugas.

### 15.4 Operasional Halaman Edit Anggota Tim (`/Member/Edit`)
1. **Informasi Profil Karyawan (Kanvas Kiri)**:
   - Mengubah Nama Lengkap, Alamat Email, Nomor WhatsApp/Telepon, Jabatan (*Job Title*), dan Divisi.
   - Mengatur hak akses peran (*Role Assignment*: Administrator atau User).
2. **Pengaturan Akun & Tenant (Panel Kanan)**:
   - Mengatur status persetujuan akun (*Approval Status*: Disetujui atau Menunggu Persetujuan).
   - Menetapkan afiliasi perusahaan (*Company Tenant*) untuk menjaga isolasi data.
   - Pratinjau avatar foto profil dan inisial warna.

### 15.5 Operasional Halaman Edit Proyek (`/Project/Edit`)
1. **Data Utama Proyek (Kanvas Kiri)**:
   - Memperbarui Nama Proyek, Deskripsi Ruang Lingkup (*Scope*), Klien (*Client Name*), serta Tagar Label Proyek.
2. **Indikator Finansial & Parameter (Panel Kanan)**:
   - Memantau dan mengubah Alokasi Anggaran (*Budget*) dan Biaya Aktual (*Actual Cost*).
   - Memantau persentase *Burn Rate* secara real-time.
   - Memilih Manajer Proyek (PM), Tanggal Tenggat Waktu (*Deadline*), Warna Identitas Proyek, dan Status Proyek.

### 15.6 Operasional Halaman Profil Akun (`/Account/Profile`)
1. **Kanvas Identitas Diri**:
   - Halaman profil kini membentang penuh (*full-width*) dengan tampilan banner cover dan foto profil modern.
   - Pengguna dapat mengganti foto avatar, memilih banner latar belakang, serta memperbarui bio dan kontak.
2. **Badge Perusahaan & Keamanan Akun**:
   - Menampilkan badge resmi nama perusahaan dan kode perusahaan tenant tempat Anda terdaftar.
   - Menyediakan panel instan ganti kata sandi dengan validasi keamanan ganda.

---

## 16. Panduan Pengujian Mutu (QA) & Pelacakan Test Case E2E Excel

Untuk memastikan kualitas, keandalan, dan stabilitas operasional sistem, Work Tracker Pro dilengkapi rangkaian dokumentasi dan alat pelacakan jaminan kualitas terpadu (*Quality Assurance Package*) pada folder `/QA`.

### 16.1 Struktur Paket Pengujian QA & Berkas Matriks
Paket QA terdiri dari:
1. **`QA/Tracking_Test_Case_E2E_TrackerKerja.xlsx`**: Berkas spreadsheet pelacak matriks pengujian end-to-end yang mencakup seluruh fungsionalitas sistem.
2. **`QA/README.md`**: Panduan SOP pengujian, tata kelola siklus rilis (*release cycles*), dan klasifikasi keparahan bug (*bug triage*).

### 16.2 Navigasi 4 Lembar Kerja Buku Tracking Excel
Buka berkas `Tracking_Test_Case_E2E_TrackerKerja.xlsx` menggunakan Microsoft Excel, WPS Office, atau LibreOffice:
1. **Lembar Kerja 1: `Dashboard & Metrik`**:
   - Menyajikan KPI eksekutif secara real-time: Total Test Cases, Jumlah Lolos (*Pass*), Gagal (*Fail*), Terhalang (*Blocked*), dan Belum Diuji (*Untested*).
   - Memperlihatkan persentase tingkat keberhasilan (*Pass Rate %*) dan ringkasan distribusi cacat berdasarkan tingkat urgensi.
2. **Lembar Kerja 2: `Master Test Case E2E`**:
   - Memuat lebih dari 65 skenario pengujian komprehensif yang mencakup 19 modul sistem:
     - Autentikasi & Registrasi Kode Perusahaan (`TC-AUTH`)
     - Tugas & Full-Width Studio (`TC-TSK`)
     - Proyek & Finansial (`TC-PRJ`)
     - Timesheet & Multi-Timer (`TC-TMS`)
     - Presensi Kehadiran (`TC-ATT`)
     - Kalender RBAC (`TC-CAL`)
     - Catatan & Lampiran (`TC-NOT`)
     - JSON & SQL Tools (`TC-JSON`, `TC-SQL`)
     - Laporan & Ekspor (`TC-RPT`)
     - Direktori Anggota & Tenant (`TC-MBR`)
     - Master Data & Konfigurasi 4-Tab (`TC-MST`, `TC-CFG`)
     - Sinkronisasi Multi-Instance (`TC-SYNC`)
     - Gamifikasi & Hadiah (`TC-GAM`)
     - Notifikasi & Audit Trail (`TC-NOTIF`, `TC-AUD`)
     - Impor Excel Standar/ARMS (`TC-IMP`)
     - RESTful Web API & Swagger (`TC-API`)
3. **Lembar Kerja 3: `Siklus Eksekusi`**:
   - Digunakan oleh tim QA untuk mencatat hasil pengujian bertahap: *Cycle 1 (Uji Asap / Smoke Test)*, *Cycle 2 (Uji Regresi Penuh)*, dan *Cycle 3 (Uji Penerimaan Pengguna / UAT)*.
4. **Lembar Kerja 4: `Defect Log`**:
   - Lembar pelacakan penemuan bug atau anomali. Setiap temuan dicatat lengkap dengan referensi Test Case, tingkat keparahan (*Critical, Major, Minor, Trivial*), penanggung jawab developer, dan status perbaikan.

### 16.3 Prosedur Eksekusi Pengujian & Pencatatan Bug (Defect Logging)
1. **Menjalankan Pengujian**:
   - Buka lembar kerja `Master Test Case E2E`.
   - Pilih modul yang akan diuji, ikuti kolom **Langkah Pengujian (Test Steps)** pada aplikasi peramban.
   - Cocokkan perilaku aplikasi dengan kolom **Hasil yang Diharapkan (Expected Result)**.
   - Ubah kolom **Status**:
     - Pilih **Pass** jika hasil sesuai ekspektasi.
     - Pilih **Fail** jika ditemukan kegagalan fungsi atau kesalahan tampilan.
     - Pilih **Blocked** jika pengujian terhambat oleh ketergantungan fitur lain.
   - Masukkan nama penguji di kolom **Tester** dan tanggal eksekusi di kolom **Execution Date**.
2. **Mencatat Temuan Masalah ke Defect Log**:
   - Jika suatu pengujian berstatus *Fail*, buka lembar `Defect Log`.
   - Tambahkan baris baru dengan ID cacat berurutan (contoh: `DEF-001`, `DEF-002`).
   - Tulis ringkasan kendala, langkah mereproduksi masalah, dan lampirkan catatan screenshot.
   - Tentukan tingkat keparahan (*Severity*) dan tetapkan developer terkait untuk segera ditindaklanjuti.

---

## 17. Tips & Pertanyaan Umum (FAQ)

### Q1: Bagaimana cara mencetak atau menyimpan panduan ini ke format PDF?
> **Jawaban**: Klik menu **📖 Panduan Pengguna** pada bilah samping (Sidebar) navigasi aplikasi di bagian bawah (*Akun & Bantuan*). Pada jendela modal panduan yang terbuka, klik tombol **🖨️ Cetak / Simpan PDF**. Pada jendela print peramban, pilih tujuan printer sebagai **Save as PDF (Simpan sebagai PDF)** dan klik **Save**.

### Q2: Mengapa di Kalender saya hanya melihat tugas milik saya sendiri?
> **Jawaban**: Untuk anggota tim reguler, kalender secara default disaring khusus untuk tugas yang ditugaskan kepada Anda agar Anda dapat fokus pada jadwal kerja pribadi. Administrator memiliki opsi dropdown untuk melihat tugas seluruh tim.

### Q3: Mengapa saya mendapatkan notifikasi pengingat Timesheet menjelang tanggal 25?
> **Jawaban**: Notifikasi tersebut merupakan pengingat otomatis bagi anggota tim yang memiliki tugas aktif namun belum mengisi catatan jam kerja (*timesheet*) agar seluruh jam kerja bulan berjalan terekam lengkap sebelum batas cut-off bulanan tanggal 25.

### Q4: Apakah saya bisa menjalankan timer untuk lebih dari satu tugas sekaligus?
> **Jawaban**: Ya. TrackerKerja mendukung multi-timer serentak. Anda dapat menekan tombol *Clock In* pada beberapa tugas berbeda dan seluruh sesi waktu akan dicatat secara akurat.

### Q5: Mengapa streak check-in harian saya kembali ke hari 1?
> **Jawaban**: Sistem menerapkan aturan toleransi absensi 2 hari. Jika Anda tidak melakukan check-in selama 2 hari berturut-turut (misal terakhir check-in hari Senin, lalu baru check-in kembali di hari Kamis), maka streak akan di-reset otomatis ke awal (Hari 1).

### Q6: Dari mana saja sumber poin yang bisa saya gunakan untuk klaim hadiah?
> **Jawaban**: Poin penukaran hadiah dibatasi secara ketat hanya dari akumulasi **Poin Master Badge yang telah Anda raih** ditambah **Poin Daily Check-In & Bonus Streak**. Poin tidak dapat dimanipulasi atau diisi secara manual.

---

*(Buku Panduan Pengguna Work Tracker Pro — Diterbitkan untuk Efisiensi & Transparansi Kerja Tim)*
