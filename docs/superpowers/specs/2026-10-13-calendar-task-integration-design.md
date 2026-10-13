# Spesifikasi Desain: FSD 5.14 Modul Kalender Tugas Interaktif & Integrasi Task

## 1. Ringkasan Eksekutif & Tujuan
Modul Kalender Tugas Interaktif (FSD 5.14) menyediakan visualisasi komprehensif jadwal tenggat waktu (*deadline*), periode pengerjaan, dan alur penugasan tugas tim di platform TrackerKerja. Sistem mengintegrasikan:
1. **Dedicated Backend Calendar REST API (`/api/calendar/events`)**: Menghasilkan data event kalender teroptimasi berbasis rentang tanggal (`start` & `end`), filter proyek, filter status, dan penegakan isolasi hak akses peran (*Role-Based Access Control - RBAC Scoping*).
2. **Multi-View Interface**: Dukungan tampilan Bulan (*Month Grid*), Minggu (*Week Column*), Hari (*Day Schedule*), dan Agenda (*Chronological Timeline List*).
3. **Modal Popup Detail Interaktif & Quick Status Update**: Memungkinkan pengguna melihat rincian lengkap tugas (termasuk kendala *obstacle* & solusi *solution*) serta memperbarui status/progres secara instan (1-klik) tanpa harus meninggalkan tampilan kalender.

---

## 2. Arsitektur & Komponen Sistem

### 2.1 Application Layer
- **File**: `backend/src/TrackerKerja.Application/DTOs/CalendarDtos.cs`
- **DTOs**:
  ```csharp
  namespace TrackerKerja.Application.DTOs;

  public record CalendarEventDto
  {
      public int Id { get; init; }
      public string Title { get; init; } = string.Empty;
      public string? Description { get; init; }
      public DateTimeOffset? Start { get; init; }
      public DateTimeOffset? End { get; init; }
      public string Priority { get; init; } = "Medium";
      public string PriorityColor { get; init; } = "#3B82F6";
      public string Status { get; init; } = "Todo";
      public string StatusColor { get; init; } = "#6366F1";
      public int Progress { get; init; }
      public string? ProjectName { get; init; }
      public string ProjectColor { get; init; } = "#6366F1";
      public int? ProjectId { get; init; }
      public string? CategoryName { get; init; }
      public string? AssignedToUserId { get; init; }
      public string? AssignedToUserName { get; init; }
      public string? AssignedToUserAvatarColor { get; init; }
      public string? Milestone { get; init; }
      public string? Obstacle { get; init; }
      public string? Solution { get; init; }
      public bool IsOverdue { get; init; }
      public bool AllDay { get; init; } = true;
  }

  public record QuickUpdateTaskStatusRequest(
      Domain.Enums.TaskStatus Status,
      int? Progress
  );
  ```

### 2.2 WebApi Layer
- **File**: `backend/src/TrackerKerja.WebApi/Controllers/CalendarController.cs`
- **Endpoints**:
  - `GET /api/calendar/events`:
    - Parameter query: `start` (DateTimeOffset?), `end` (DateTimeOffset?), `filter` (string? "mine" | "all"), `projectId` (int?), `status` (int?).
    - Filter tanggal: mencakup tugas di mana `(StartDate <= end && (DueDate >= start || DueDate == null))` ATAU `(DueDate >= start && DueDate <= end)`.
    - Aturan RBAC:
      - Non-admin: dipaksa `filter = "mine"` (`AssignedToUserId == currentUserId`).
      - Admin: dapat memilih `filter = "all"` (seluruh tim di company) atau `filter = "mine"`.
    - Mengembalikan `Ok(new { success = true, data = events })`.
  - `PATCH /api/calendar/events/{id}/status`:
    - Mengubah status tugas secara instan. Jika status diubah menjadi `Done`, progress otomatis di-set ke `100`.
    - Memperbarui `UpdatedAt = DateTimeOffset.UtcNow`.
    - Mengembalikan `Ok(new { success = true, message = "Status tugas berhasil diperbarui.", data = updatedTask })`.

### 2.3 Frontend Presentation Layer
- **File**: `frontend/src/app/(with-layouts)/calendar/page.tsx`
- **Komponen & Fitur**:
  1. **Header & Navigation Bar**:
     - Selector Bulan & Tahun dengan tombol panah kiri/kanan dan tombol cepat *"Hari Ini"*.
     - Mode Switcher: Tab pil `Bulan` (`LayoutGrid`), `Minggu` (`Clock`), `Hari` (`CalendarIcon`), `Agenda` (`List`).
     - Real-Time Scope Switcher: Dropdown filter *"Semua Tugas Tim"* vs *"Tugas Saya"* (hanya aktif untuk Admin, otomatis terkunci *"Tugas Saya"* untuk Member).
     - Filter Proyek & Filter Status untuk mempersempit jadwal.
  2. **Month Grid View**:
     - Matriks 7x5/7x6 hari (Senin–Minggu).
     - Penanda visual hari ini (*Today Indicator*) dengan highlight lembut.
     - Setiap kartu tanggal memuat pil tugas dengan warna sesuai proyek, penanda overdue (merah jika melewati deadline), dan counter jika tugas > 3.
  3. **Week View**:
     - 7 kolom hari minggu aktif dengan kartu tugas yang lebih informatif (menampilkan PIC, badge status, dan prioritas).
  4. **Day View**:
     - Fokus satu hari dengan daftar tugas terperinci beserta deskripsi dan progress bar.
  5. **Agenda / Timeline View**:
     - Daftar kronologis vertikal tugas mendatang yang dikelompokkan berdasarkan tanggal deadline.
  6. **Modal Popup Detail Tugas Interaktif (`detailModalOpen`)**:
     - Menampilkan judul tugas, proyek, PIC, status, prioritas, milestone, tanggal mulai, deadline, obstacle, dan solution.
     - **Quick Status Actions**: Baris tombol interaktif untuk mengubah status langsung ke *To Do*, *In Progress*, *Review*, atau *Done* (memanggil `PATCH /api/calendar/events/{id}/status` dengan revalidasi query seketika).
     - Tombol *Buka Studio Edit Tugas* mengarah ke `/tasks/{id}`.
  7. **Modal Rekap Tanggal (`dayModalOpen`)**:
     - Menampilkan seluruh tugas pada tanggal tertentu saat pengguna mengklik kartu tanggal atau "+X lainnya".

---

## 3. Spesifikasi Keamanan & Penegakan RBAC
1. **Multi-Tenancy Guard**:
   - Seluruh kueri basis data pada `CalendarController` terikat pada `CurrentCompanyId` dari `ICurrentTenantService`.
2. **Strict RBAC Scoping**:
   - Jika pengguna bukan Administrator (`!_tenantService.IsAdmin && !User.IsInRole("Administrator")`), kueri wajib memfilter `t.AssignedToUserId == currentUserId`.
3. **Audit Logging**:
   - Perubahan status cepat melalui `PATCH /api/calendar/events/{id}/status` otomatis mencatat jejak audit via filter global atau context.

---

## 4. Strategi Pengujian (Testing Strategy)
1. **Unit Testing Backend (`TrackerKerja.Tests/CalendarControllerTests.cs`)**:
   - Pengujian pengambilan event dengan rentang tanggal.
   - Pengujian pembatasan RBAC: user biasa hanya melihat tugas sendiri, admin dapat melihat semua tugas.
   - Pengujian filter berdasarkan project dan status.
   - Pengujian patch update status cepat (Done otomatis mengubah progress ke 100%).
2. **Frontend Build Verification**:
   - `npm run build` berhasil 100% tanpa error TypeScript pada halaman kalender.
