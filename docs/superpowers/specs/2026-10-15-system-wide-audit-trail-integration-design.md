# System-Wide Audit Trail Integration Design

## 1. Overview
This design integrates an automated, comprehensive, and human-friendly audit trail across all application modules and events in **TrackerKerja Modern (Work Tracker Pro)**. It ensures that every mutating business event and critical security event (logins, failed attempts, registrations, logouts) is tracked, attributed to the actor, categorized by business module in Indonesian, and queryable across specialized views (Global Explorer, Task Studio, Project Studio, Member Profile).

## 2. Business Modules & Event Mapping

| Controller | Indonesian Business Module | Captured Events | Action Summary Template |
| :--- | :--- | :--- | :--- |
| `AuthController` | Autentikasi & Akun | Login Success, Login Failed (wrong password), Account Lockout, Unapproved Login Attempt, Registration, Logout | "Login berhasil", "Percobaan masuk gagal (kredensial salah)", "Pendaftaran akun baru" |
| `ProjectsController` | Manajemen Proyek | Create Project, Update Metadata & Budget, Change Status, Bulk Task Allocation, Delete Project | "Membuat proyek baru '{name}'", "Mengubah pagu anggaran proyek", "Menghapus proyek" |
| `TasksController` | Manajemen Tugas | Create Task, Update Task, Change Kanban Status, Delete, Import Excel, Export Excel | "Membuat tugas baru '{title}'", "Memindahkan status tugas ke '{status}'", "Impor tugas massal via Excel" |
| `TimesheetsController` | Timesheet & Timer | Start Multi-Timer, Stop Timer, Manual Entry, Update Session, Delete Session | "Memulai timer kerja tugas #{taskId}", "Menghentikan timer kerja", "Mencatat jam kerja manual" |
| `AttendancesController` | Presensi & Kehadiran | Clock In (WFO/WFH/Dinas/Remote), Clock Out, Leave Request, Admin Reconciliation | "Presensi masuk Clock In ({location})", "Presensi pulang Clock Out", "Admin merekonsiliasi presensi staf" |
| `NotesController` | Catatan & Dokumen | Create Note, Update Note, Pin/Unpin Note, Upload Attachment, Delete Note | "Membuat catatan kerja baru '{title}'", "Menyematkan (Pin) catatan", "Mengunggah lampiran berkas" |
| `GamificationController` | Gamifikasi & Hadiah | Daily Check-In, Claim Reward, Admin Award Badge, Admin Revoke Badge, Admin Approve Claim, Admin Reject Claim, Admin CRUD Reward | "Check-in harian (+10 Poin)", "Mengajukan klaim voucher '{name}'", "Admin menganugerahkan lencana", "Admin memproses klaim hadiah" |
| `AnnouncementsController` | Pengumuman Resmi | Create Announcement, Update, Toggle Active, Mark Read | "Menerbitkan pengumuman resmi '{title}'", "Mengubah status aktif pengumuman" |
| `MembersController` | Manajemen Anggota | Approve Member, Reject Member, Unlock Account, Delete Permanent, Update Profile | "Menyetujui pendaftaran staf '{name}'", "Membuka kunci akun staf", "Menghapus akun permanen" |
| `SettingsController` | Konfigurasi Sistem | Update System Settings, Update SMTP, Purge Operational Data | "Menyimpan konfigurasi sistem", "Mengeksekusi pembersihan & reset data operasional" |
| `MasterDataController` | Master Data SDLC | CRUD Priorities, Statuses, Milestones, Categories | "Menambah item master data '{name}'", "Memperbarui status SDLC" |
| `DevToolsController` | Developer Tools | JSON Format/Validate, SQL Beautify/Run | "Memformat struktur JSON", "Menjalankan query SQL read-only" |
| `SyncController` | Sinkronisasi Host Induk | Ping Host, Push Data, Pull Data | "Mengirim paket sinkronisasi data ke host induk", "Menerima data dari host induk" |

## 3. Technical Architecture

### 3.1 Enhanced `AuditLogActionFilter`
- Captures `POST`, `PUT`, `DELETE`, `PATCH` globally.
- Also intercepts `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/logout`.
- Infers or correlates User ID and Email even for unauthenticated endpoints when login succeeds (or captures attempted email on 401/403/423).
- Extracts or enriches JSON `Details` with:
  ```json
  {
    "module": "Autentikasi & Akun",
    "actionSummary": "Login berhasil ke sistem",
    "entityId": "user-1",
    "params": { ... }
  }
  ```

### 3.2 Backend Endpoints in `AuditLogsController`
- `GET /api/audit-logs`: supports `module` query filter.
- `GET /api/audit-logs/project/{projectId}`: returns logs targeting or containing that project ID.
- `GET /api/audit-logs/member/{userId}`: returns logs performed by or targeting that user ID.
- `GET /api/audit-logs/modules`: returns list of distinct business modules.

### 3.3 Frontend Integration
- `/audit-trail`: Add Module filter dropdown and module badges.
- `/projects/[id]`: Add "Log Aktivitas & Audit Proyek" tab.
- `/members`: Add "Log Aktivitas" modal/drawer per member.
