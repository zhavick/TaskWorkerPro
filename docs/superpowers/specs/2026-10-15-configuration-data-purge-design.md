# Design Spec: Configuration Data Maintenance & Purge Tab (FSD 5.23 / Master Data & Maintenance)

## 1. Overview & Objective
Menyediakan antarmuka dan backend terpadu pada menu **Konfigurasi Sistem (`/configuration`)** berupa satu tab khusus: **"Pembersihan Data" (Data Purge & Reset)**.
Tab ini memungkinkan Administrator untuk:
1. Melihat rekapitulasi data operasional saat ini beserta data yang diproteksi secara permanen.
2. Melakukan **Pembersihan Total (Full Operational Reset)**: Menghapus seluruh data operasional (Tugas, Sesi, Proyek, Presensi, Catatan, Riwayat Tool/Audit, dan Pengguna non-admin).
3. **Aturan Proteksi Mutlak (Preserved Whitelist)**:
   - **Akun Administrator**: Akun dengan peran `Administrator` / `SuperAdmin` dan akun yang sedang login **TIDAK DIHAPUS**.
   - **Master Data**: Seluruh tabel referensi (`MasterPriorities`, `MasterStatuses`, `MasterMilestones`, `Categories`, `SystemSettings`, `EmailTemplates`, `Companies`) **TIDAK DIHAPUS**.
   - **Pengumuman**: Seluruh pengumuman sistem (`Announcements`) **TIDAK DIHAPUS**.
4. Melakukan **Pembersihan Modular / Selektif**: Administrator dapat memilih domain data tertentu yang ingin dibersihkan (misal hanya Tugas & Sesi, atau hanya Catatan, atau hanya Presensi).

## 2. Protected Data Architecture (Whitelist vs Purgeable)

```
┌────────────────────────────────────────────────────────────────────────┐
│                   PERMANENTLY PRESERVED (WHITELIST)                    │
├────────────────────────────────┬───────────────────────────────────────┤
│ 1. Akun Administrator / Super  │ AppUser (JobTitle: Admin/Architect,   │
│    Admin & Current User        │ usr-superadmin, admin@...)            │
│ 2. Master Data SDLC & Settings │ Priorities, Statuses, Milestones,     │
│                                │ Categories, Settings, EmailTemplates  │
│ 3. Pengumuman Perusahaan       │ Announcements                         │
│ 4. Struktur Tenant Perusahaan  │ Companies                             │
└────────────────────────────────┴───────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│                   PURGEABLE OPERATIONAL DATA (DELETABLE)               │
├────────────────────────────────┬───────────────────────────────────────┤
│ 1. Tugas & Hierarki Subtugas   │ Tasks (dan child Subtasks)            │
│ 2. Sesi Kerja & Timesheet      │ Sessions                              │
│ 3. Proyek Operasional          │ Projects                              │
│ 4. Presensi & Absensi          │ Attendances                           │
│ 5. Catatan & File Lampiran     │ Notes & NoteAttachments               │
│ 6. Gamifikasi Non-Admin        │ DailyCheckIns, UserBadges, Rewards    │
│ 7. Riwayat Tools & Log         │ JsonHistories, SqlHistories, AuditLogs│
│ 8. Personil / User Non-Admin   │ AppUsers (kecuali Admin whitelist)    │
└────────────────────────────────┴───────────────────────────────────────┘
```

## 3. Data Schema & Models

### 3.1 DTOs (`TrackerKerja.Application.DTOs`)
- `DataMaintenanceStatsDto`:
  - `TasksCount`: int
  - `ProjectsCount`: int
  - `SessionsCount`: int
  - `AttendancesCount`: int
  - `NotesCount`: int
  - `NoteAttachmentsCount`: int
  - `NonAdminUsersCount`: int
  - `ToolHistoriesCount`: int
  - `AuditLogsCount`: int
  - `AdminUsersCount`: int (Preserved)
  - `MasterDataItemsCount`: int (Preserved)
  - `AnnouncementsCount`: int (Preserved)

- `DataPurgeRequest`:
  - `PurgeAll`: bool
  - `PurgeTasks`: bool
  - `PurgeProjects`: bool
  - `PurgeAttendances`: bool
  - `PurgeNotes`: bool
  - `PurgeNonAdminUsers`: bool
  - `PurgeAuditAndHistories`: bool
  - `ConfirmationKeyword`: string (e.g. "RESET-TOTAL" or "KONFIRMASI")

- `DataPurgeResultDto`:
  - `Success`: bool
  - `TotalRecordsDeleted`: int
  - `DeletedTasksCount`: int
  - `DeletedProjectsCount`: int
  - `DeletedSessionsCount`: int
  - `DeletedAttendancesCount`: int
  - `DeletedNotesCount`: int
  - `DeletedUsersCount`: int
  - `DeletedHistoriesCount`: int
  - `Messages`: List<string>

## 4. Endpoints

| Method | Endpoint | Authorization | Description |
|--------|----------|---------------|-------------|
| GET | `/api/settings/maintenance/stats` | Administrator, SuperAdmin | Statistik jumlah data saat ini |
| POST | `/api/settings/maintenance/purge` | Administrator, SuperAdmin | Eksekusi pembersihan total/parsial |

## 5. UI / UX Design (`/configuration` Tab 7: "Pembersihan Data")
1. **Safety Alert Banner**: Penjelasan bahwa tindakan penghapusan bersifat permanen (irreversible), serta penegasan bahwa Admin, Master Data, dan Pengumuman selalu aman.
2. **Kartu Proteksi & Inventaris**:
   - Hijau (Data Dilindungi): Administrator (N), Master Data (N), Pengumuman (N).
   - Merah/Abu-abu (Data Operasional): Tugas, Proyek, Sesi, Presensi, Catatan, Pengguna biasa.
3. **Panel 1: Reset Total (Full Purge)**:
   - Tombol "Hapus Seluruh Data Operasional & Reset Pabrik".
   - Dialog konfirmasi ketat dengan pengetikan kata kunci `RESET-TOTAL` untuk mencegah klik tanpa sengaja.
4. **Panel 2: Pembersihan Modular / Kategori**:
   - Checkbox untuk memilih kategori spesifik.
   - Tombol "Bersihkan Kategori Terpilih".
