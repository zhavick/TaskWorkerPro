# Spesifikasi Desain: FSD 5.10 Modul Ekspor Tugas Excel (Format Standar & ARMS Enterprise)

## 1. Ringkasan Eksekutif & Tujuan
Modul Ekspor Tugas Excel (FSD 5.10) menyediakan kapabilitas pengunduhan dan pelaporan data tugas operasional ke dalam berkas spreadsheet Microsoft Excel (`.xlsx`) berstandar enterprise.

Modul ini mendukung **dua format laporan**:
1. **Format Standar (9 Kolom)**: Format ringkas operasional harian yang mencakup esensi penugasan, progres, PIC, tenggat, dan kendala/solusi untuk kebutuhan review harian/mingguan.
2. **Format ARMS Enterprise (21 Kolom + Executive Summary Sheet)**: Format resmi berstandar industri dengan pemetaan milestone SDLC Waterfall (*Application Release & Milestone System*). Format ini dilengkapi lembar ringkasan eksekutif (*Executive Summary*) yang memuat agregasi metrik proyek, distribusi status tugas, rasio keterlambatan (*overdue*), dan akumulasi jam kerja (*total man-hours*).

Seluruh operasi ekspor dilindungi oleh penegakan isolasi multi-tenant (`CompanyId`) dan hak akses peran (*Role-Based Access Control - RBAC*).

---

## 2. Arsitektur & Komponen Sistem

### 2.1 Application Layer
- **File**: `backend/src/TrackerKerja.Application/DTOs/TaskDtos.cs`
- **DTO Filter**:
  ```csharp
  public record TaskExportFilterDto
  {
      public string Format { get; init; } = "standard"; // "standard" | "arms"
      public DateTimeOffset? StartDate { get; init; }
      public DateTimeOffset? EndDate { get; init; }
      public int? ProjectId { get; init; }
      public int? Status { get; init; }
      public string Scope { get; init; } = "mine"; // "mine" | "all"
  }
  ```
- **Interface**: `backend/src/TrackerKerja.Application/Common/Interfaces/IExcelExportService.cs`
  ```csharp
  public interface IExcelExportService
  {
      Task<byte[]> GenerateTimesheetExcelAsync(TimesheetExportFilter filter, int? companyId);
      Task<byte[]> GenerateTasksExcelAsync(
          TaskExportFilterDto filter,
          int? companyId,
          string currentUserId,
          bool isAdmin,
          CancellationToken cancellationToken = default);
  }
  ```

---

### 2.2 Infrastructure Layer (ClosedXML Engine)
- **File**: `backend/src/TrackerKerja.Infrastructure/Services/ClosedXmlExportService.cs`
- **Logika Query & RBAC Scoping**:
  - Membaca data dari `_context.Tasks` dengan `.Include(t => t.Project)`, `.Include(t => t.Category)`, `.Include(t => t.AssignedToUser)`, `.Include(t => t.ParentTask)`, dan `.Include(t => t.Sessions)`.
  - Filter wajib: `t.CompanyId == companyId`.
  - Penegakan RBAC: Jika pengguna bukan Administrator atau `filter.Scope == "mine"`, secara otomatis dipaksakan `query = query.Where(t => t.AssignedToUserId == currentUserId)`.
  - Filter opsional: `ProjectId`, `Status`, rentang tanggal `StartDate` dan `EndDate` (dicocokkan terhadap `DueDate` atau `StartDate`).

#### A. Format Standar (9 Kolom)
- **Worksheet**: `"Daftar Tugas"`
- **Judul Header**: `"LAPORAN DAFTAR TUGAS OPERASIONAL"` (Font Size 14, Bold, Warna `#4F46E5`).
- **Sub-Info**: Periode filter, tanggal cetak, dan PIC pelapor.
- **Struktur Kolom**:
  1. `No`
  2. `Proyek`
  3. `Judul Tugas`
  4. `Prioritas`
  5. `Status`
  6. `Progres (%)`
  7. `PIC`
  8. `Tenggat Waktu`
  9. `Kendala & Solusi`
- **Gaya Visual**:
  - Baris header bertema Indigo `#4F46E5`, teks putih tebal, rata tengah.
  - Zebra striping pada baris genap (`#F8FAFC`).
  - Alignment: Angka rata tengah, teks rata kiri, status dan prioritas dengan format rapi.
  - Auto-fit kolom dengan padding minimum.

#### B. Format ARMS Enterprise (21 Kolom)
- **Sheet 1: `"Ringkasan Eksekutif"` (Executive Summary)**:
  - Header: `"RINGKASAN EKSEKUTIF PROYEK & SDLC (ARMS)"` (Warna `#1E3A8A`).
  - Blok Kartu Metrik Ringkas:
    - Total Tugas Terdaftar
    - Tugas Selesai (*Done*)
    - Tugas Sedang Berjalan (*In Progress*)
    - Tugas Melewati Tenggat (*Overdue*)
    - Akumulasi Jam Kerja (*Total Logged Hours*)
  - Tabel Agregasi Proyek: Nama Proyek, Total Tugas, Selesai, Progres Rata-rata, Total Jam.
  - Tabel Agregasi Milestone SDLC: Nama Milestone (*Requirement*, *Design*, *Implementation*, *Testing*, *Deployment*, *Maintenance*), Jumlah Tugas, Rasio Selesai.
- **Sheet 2: `"Rincian Tugas ARMS"` (21 Kolom)**:
  1. `No`
  2. `Project Code` (`PRJ-{ProjectId:D3}`)
  3. `Project Name`
  4. `Task Code` (`TSK-{Id:D4}`)
  5. `Parent Task Code` (Kode tugas induk jika sub-tugas, atau `"-"`)
  6. `Task Title`
  7. `Description`
  8. `SDLC Milestone`
  9. `Category`
  10. `Priority`
  11. `Status`
  12. `Progress (%)`
  13. `PIC Name`
  14. `PIC Email`
  15. `Start Date` (`yyyy-MM-dd`)
  16. `Due Date` (`yyyy-MM-dd`)
  17. `Total Logged Hours` (Durasi sesi jam kerja dalam jam, format desimal `0.00`)
  18. `Obstacle` (Kendala Operasional)
  19. `Solution` (Solusi Teknis)
  20. `Created At` (`yyyy-MM-dd HH:mm`)
  21. `Updated At` (`yyyy-MM-dd HH:mm`)
- **Gaya Visual**:
  - Baris header bertema Biru Korporat `#1E3A8A`, teks putih tebal.
  - Freeze panes pada baris header (baris data dapat di-scroll bebas).
  - Excel auto-filter aktif pada baris header.
  - Format angka standar: Progres (`0"%"`) dan Jam (`0.00`).

---

### 2.3 WebApi Controller Layer
- **File**: `backend/src/TrackerKerja.WebApi/Controllers/TasksController.cs`
- **Endpoint**:
  ```http
  GET /api/tasks/export?format={standard|arms}&startDate={...}&endDate={...}&projectId={...}&status={...}&scope={mine|all}
  ```
- **Respon**:
  - `Content-Type`: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - `Content-Disposition`: `attachment; filename="Laporan_Tugas_{timestamp}.xlsx"` atau `"Laporan_ARMS_{timestamp}.xlsx"`.

---

### 2.4 Frontend Layer (Next.js 16)
- **Komponen Dialog**: `frontend/src/components/tasks/export-excel-dialog.tsx`
  - Pilihan Format: Kartu interaktif memilih *Format Standar (9 Kolom)* vs *Format ARMS Enterprise (21 Kolom + Summary)*.
  - Pilihan Rentang Waktu: Preset cepat (*Semua Waktu*, *Bulan Ini*, *30 Hari Terakhir*, *Kustom Tanggal Mulai/Akhir*).
  - Pilihan Proyek: Dropdown proyek dari `/api/projects`.
  - Pilihan Status: Dropdown status (*Semua*, *To Do*, *In Progress*, *Done*, *Overdue*).
  - Pilihan Scope (Khusus Admin): *Semua Tim* vs *Tugas Saya*.
  - Eksekusi download via Axios blob response dengan pembuatan elemen anchor dinamis (`URL.createObjectURL`).
- **Integrasi Halaman**: `frontend/src/app/(with-layouts)/tasks/page.tsx`
  - Tombol **"Ekspor Excel"** diletakkan berdampingan dengan tombol **"Impor Excel"** pada bilah aksi atas.

---

## 3. Matriks Pengujian & Verifikasi (TDD)
1. **Unit Tests (`TrackerKerja.Tests/TaskExportTests.cs`)**:
   - `GenerateTasksExcelAsync_StandardFormat_ProducesValidWorkbookWith9Columns`: Memastikan workbook format standar memiliki 9 kolom dan data yang sesuai.
   - `GenerateTasksExcelAsync_ArmsFormat_ProducesSummarySheetAnd21ColumnsDetail`: Memastikan format ARMS menghasilkan 2 sheet dan 21 kolom detail.
   - `GenerateTasksExcelAsync_NonAdmin_EnforcesMineScopeOnly`: Memastikan data tugas pengguna lain tidak pernah bocor ke pengguna non-admin.
   - `GenerateTasksExcelAsync_WithDateAndProjectFilter_FiltersCorrectly`: Memastikan filter proyek dan rentang waktu bekerja dengan benar.
2. **Kompilasi & Build**:
   - `dotnet test backend/TrackerKerja.sln` lolos 100%.
   - `npm --prefix frontend run build` lolos tanpa kesalahan TypeScript/lint.
