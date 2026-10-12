# 📋 FASE 7: MANAJEMEN TUGAS, KANBAN BOARD & STUDIO LAYOUT
## TRACKERKERJA MODERN (WORK TRACKER PRO)

> **Spesifikasi Modul Tugas, Hierarki Sub-Tugas, Catatan Kendala & Solusi, Papan Kanban Interaktif (@dnd-kit), Layout Studio Bentang Penuh, dan Penyatuan Simpan Form**  
> **Target Framework**: .NET Core Web API, PostgreSQL 16, Next.js 16 (TailGrids + @dnd-kit)  
> **Status**: Ready for Implementation  

---

## 1. Lingkup Fungsional & Atribut Tugas Kerja

Tugas kerja (*WorkTask*) adalah unit operasional harian terpenting di TrackerKerja:
1. **Hierarki Tugas Induk & Sub-Tugas**: Mendukung struktur pohon pekerjaan melalui relasi `parent_task_id` tak terbatas level.
2. **Kendala & Solusi Teknis (*Obstacle & Solution Log*)**: Kolom pencatatan kendala kerja yang dihadapi dan resolusi teknis yang diambil.
3. **Penyatuan Formulir Edit & Jam Kerja Manual (*Unified Save Architecture*)**:
   - Memungkinkan pengguna memperbarui data tugas (status, progres slider, kendala, solusi) dan sekaligus mencatat sesi jam kerja manual baru (*Manual Work Session*) dalam satu tombol simpan secara transaksi atomik (`IDbContextTransaction`).
4. **Papan Kanban Interaktif**:
   - 4 Kolom Status Standar: **Todo**, **InProgress**, **Done**, dan **Overdue**.
   - Drag-and-drop kartu tugas antar kolom dengan pembaruan instan (*optimistic UI update*).

---

## 2. Tata Letak Studio Bentang Penuh (Full-Width Responsive Studio Layout)

Formulir detail dan pengubahan tugas (`/tasks/[id]`) dirancang dengan tata letak studio bentang penuh 12-kolom (`lg:grid-cols-12`) ergonomis:

```
+-----------------------------------------------------------------------------------------+
| Topbar: [WCH] Wahana Central Holding | Task #TK-1082: Refactor API Engine               |
+-----------------------------------------------------------------------------------------+
|                                                           | [Sticky Sidebar Kanan (4k)] |
| [Kolom Konten Utama (8 Kolom)]                            | Status: [ InProgress v ]   |
|                                                           | Progress: [========  ] 80%  |
| 1. Judul Tugas: [ Implementasi Npgsql EF Core 8        ]  | PIC Assignee: [ John Doe v ]|
| 2. Deskripsi Lengkap: (Rich Text Editor)                  | Prioritas: [ Critical  v ]  |
| 3. Catatan Kendala (Obstacle):                            | Milestone: [ Development v ]|
|    "Lock contention saat migrasi tabel sesi kerja"        | Proyek: [ Core Platform v ] |
| 4. Solusi Teknis (Solution):                              | Tanggal Mulai & Deadline    |
|    "Menggunakan skema partitioning dan connection pooling"| --------------------------- |
| 5. Catatan Jam Kerja Manual Terpadu (Unified Session Log) | Sub-Tugas Checklist (3/5)   |
|    [ Mulai: 09:00 ] [ Selesai: 12:30 ] [ Durasi: 3.5 Jam ]| - [x] Bikin migration DDL   |
| 6. Riwayat Sesi Live Timer & Catatan Terkait              | - [x] Konfigurasi DbContext |
|                                                           | - [ ] Unit test query filter|
+-----------------------------------------------------------------------------------------+
| [Bilah Aksi Mengambang - Sticky Bottom Action Bar]                                      |
| [Kembali ke Daftar]                       [Hapus Tugas]    [ Simpan Seluruh Perubahan ] |
+-----------------------------------------------------------------------------------------+
```

---

## 3. Kontrak Endpoint REST API (`/api/tasks`)

### A. Operasi Tugas Inti
- `GET /api/tasks` — Mengambil daftar tugas dengan paginasi, pencarian, dan filter (`projectId`, `status`, `priority`, `milestone`, `assignedToUserId`, `parentTaskId`).
- `GET /api/tasks/{id}` — Detail lengkap tugas termasuk sub-tugas, riwayat sesi jam kerja, dan catatan terlampir.
- `POST /api/tasks` — Membuat tugas baru.
- `PUT /api/tasks/{id}` — Memperbarui data tugas secara terpisah.
- `PUT /api/tasks/{id}/unified-save` — **Penyatuan Simpan Form**: Memperbarui detail tugas dan mencatat sesi kerja manual baru sekaligus.
- `PATCH /api/tasks/{id}/status` — Mengubah status tugas secara instan (digunakan oleh drag-and-drop Kanban Board).
- `PATCH /api/tasks/{id}/progress` — Mengubah nilai progres slider (0–100%).
- `DELETE /api/tasks/{id}` — Menghapus tugas (validasi RBAC: hanya pemilik atau Admin/Elevated).

### B. Sub-Tugas & Kanban
- `GET /api/tasks/{id}/subtasks` — Daftar seluruh anak tugas.
- `POST /api/tasks/{id}/subtasks` — Menambah sub-tugas baru langsung di bawah tugas induk.
- `GET /api/tasks/kanban` — Mengambil data tugas terkelompok per status kolom Kanban.

---

## 4. Format DTO (C#)

```csharp
public record UnifiedSaveTaskRequest(
    string Title,
    string? Description,
    int Priority,
    int Status,
    int Progress,
    string? Milestone,
    string? Obstacle,
    string? Solution,
    int? ProjectId,
    int? CategoryId,
    string? AssignedToUserId,
    DateTimeOffset? StartDate,
    DateTimeOffset? DueDate,
    // Parameter Sesi Kerja Manual Opsional
    bool LogManualSession,
    DateTimeOffset? ManualSessionStartTime,
    DateTimeOffset? ManualSessionEndTime,
    string? ManualSessionNotes
);

public record UpdateTaskStatusRequest(
    int Status
);
```

### Logika Implementasi Unified Save di Controller:
```csharp
[HttpPut("{id}/unified-save")]
public async Task<IActionResult> UnifiedSave(int id, [FromBody] UnifiedSaveTaskRequest request)
{
    using var transaction = await _context.Database.BeginTransactionAsync();
    try
    {
        var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == id);
        if (task == null) return NotFound(new { message = "Tugas tidak ditemukan." });

        // 1. Update data tugas
        task.Title = request.Title;
        task.Description = request.Description;
        task.Priority = request.Priority;
        task.Status = request.Status;
        task.Progress = request.Progress;
        task.Milestone = request.Milestone;
        task.Obstacle = request.Obstacle;
        task.Solution = request.Solution;
        task.ProjectId = request.ProjectId;
        task.CategoryId = request.CategoryId;
        task.AssignedToUserId = request.AssignedToUserId;
        task.StartDate = request.StartDate;
        task.DueDate = request.DueDate;
        task.UpdatedAt = DateTimeOffset.UtcNow;

        // 2. Tambah sesi jam kerja manual jika dicentang
        if (request.LogManualSession && request.ManualSessionStartTime.HasValue && request.ManualSessionEndTime.HasValue)
        {
            var durationSeconds = (long)(request.ManualSessionEndTime.Value - request.ManualSessionStartTime.Value).TotalSeconds;
            if (durationSeconds > 0)
            {
                var session = new WorkSession
                {
                    TaskId = task.Id,
                    UserId = _tenantService.UserId!,
                    StartTime = request.ManualSessionStartTime.Value,
                    EndTime = request.ManualSessionEndTime.Value,
                    Duration = durationSeconds,
                    Notes = request.ManualSessionNotes ?? "Dicatat via Unified Save Form"
                };
                _context.Sessions.Add(session);
            }
        }

        await _context.SaveChangesAsync();
        await transaction.CommitAsync();

        return Ok(new { success = true, message = "Tugas dan sesi jam kerja berhasil disimpan." });
    }
    catch (Exception ex)
    {
        await transaction.RollbackAsync();
        return StatusCode(500, new { message = "Gagal menyimpan perubahan: " + ex.Message });
    }
}
```

---

## 5. Implementasi Frontend Next.js (Berdasarkan `sample-web-ui`)

1. **Kanban Board (`/tasks/kanban`)**:
   - Menggunakan `@dnd-kit/react` yang sudah ada di dependensi `sample-web-ui`.
   - Mengelompokkan kartu ke dalam 4 kolom responsif dengan scrollbar halus (`tailwind-scrollbar`).
   - Pada layar mobile `< 768px`, sediakan *segmented switch button* untuk berganti antar kolom status.
2. **Grid Tabel Tugas (`/tasks`)**:
   - Memanfaatkan `@tanstack/react-table` dengan pencarian judul instan, filter dropdown prioritas/status, dan paginasi interaktif.
3. **Form Studio Bentang Penuh (`/tasks/[id]`)**:
   - Tata letak grid 12-kolom (`w-full grid grid-cols-1 lg:grid-cols-12 gap-6`).
   - Sticky sidebar kanan (`lg:col-span-4 sticky top-6`).
   - Sticky bottom action bar dengan bayangan elegan (`sticky bottom-0 z-20 bg-card-surface-area border-t border-card-border p-4 flex justify-between items-center`).
