# ⏱️ FASE 8: TIMESHEET, MULTI-TIMER & EKSPOR EXCEL RESMI
## TRACKERKERJA MODERN (WORK TRACKER PRO)

> **Spesifikasi Modul Timesheet, Multi-Timer Serentak Real-Time, Pencatatan Jam Manual & Ekspor Excel Multi-Sheet (ClosedXML)**  
> **Target Framework**: .NET Core Web API, PostgreSQL 16, ClosedXML 0.104.2, Next.js 16  
> **Status**: Ready for Implementation  

---

## 1. Arsitektur Multi-Timer Serentak (Concurrent Multi-Timer Engine)

Sistem mengizinkan pengguna menjalankan beberapa penghitung waktu kerja (*live timer*) sekaligus untuk tugas-tugas berbeda secara bersamaan:
1. **Status Timer Berjalan**:
   - Ditandai oleh entitas `sessions` di mana atribut `end_time IS NULL`.
   - Durasi berjalan dihitung dinamis: $\text{Durasi} = \text{CurrentUtcTime} - \text{start_time}$.
2. **Tidak Saling Mengganggu Antar Pengguna**:
   - Seluruh sesi terikat ke `user_id` dan `company_id`.
   - Timer pengguna A yang sedang berjalan sama sekali tidak mempengaruhi pengguna B.
3. **Penyimpanan Durasi Final**:
   - Saat pengguna menekan tombol *Stop Timer*, sistem mengisi `end_time = UtcNow`, menghitung total durasi dalam satuan **detik** (`duration = (end_time - start_time).TotalSeconds`), dan menyimpannya secara persisten.

---

## 2. Kontrak Endpoint REST API (`/api/timesheets`)

### A. Operasi Sesi Timer & Manual
- `GET /api/timesheets/active-timers` — Mengambil seluruh timer yang sedang aktif berjalan milik pengguna yang sedang login.
- `POST /api/timesheets/start` — Memulai live timer baru untuk tugas tertentu:
  ```json
  {
    "taskId": 1082,
    "notes": "Mulai pengerjaan perbaikan query"
  }
  ```
- `POST /api/timesheets/{sessionId}/stop` — Menghentikan timer yang sedang berjalan dan mencatat durasi total.
- `POST /api/timesheets/manual` — Mencatat sesi kerja manual dengan `startTime`, `endTime`, `durationSeconds`, dan `notes`.
- `GET /api/timesheets/sessions` — Paginasi riwayat sesi jam kerja (filter: `userId`, `projectId`, `taskId`, `startDate`, `endDate`).
- `DELETE /api/timesheets/sessions/{sessionId}` — Menghapus sesi kerja (hanya pemilik atau Admin).

### B. Ekspor Laporan Excel Resmi (ClosedXML Engine)
- `GET /api/timesheets/export/excel?startDate=...&endDate=...&projectId=...` — Menghasilkan file spreadsheet `.xlsx` resmi dengan formula multi-sheet.

---

## 3. Spesifikasi Laporan Excel Resmi (ClosedXML Engine)

File `.xlsx` yang dihasilkan oleh backend terdiri dari 3 sheet terformat profesional:

```
[ Workbook: Laporan_Timesheet_TrackerKerja_2026.xlsx ]
├── Sheet 1: "Rincian Sesi Harian"
│   ├── Header: Tanggal | Tugas | Proyek | PIC | Jam Mulai | Jam Selesai | Durasi (Jam) | Catatan
│   ├── Format angka: Jam format [0.00], formula durasi otomatis
│   └── Total baris bawah: Formula SUM durasi jam
├── Sheet 2: "Rekapitulasi Proyek & Man-Days"
│   ├── Header: No | Nama Proyek | Total Sesi | Total Jam Kerja | Konversi Man-Days (MD)
│   ├── Formula Man-Days: =ROUND(TotalJam / 8.0, 2)
│   └── Rekap serapan jam kerja per proyek
└── Sheet 3: "Kontribusi Anggota Tim"
    └── Rangkuman total jam kerja yang diselesaikan oleh masing-masing personel
```

### Implementasi Ekspor di Layer `Infrastructure`:
```csharp
public async Task<byte[]> GenerateTimesheetExcelAsync(TimesheetExportFilter filter)
{
    using var workbook = new XLWorkbook();
    
    // 1. Sheet Rincian Harian
    var wsDaily = workbook.Worksheets.Add("Rincian Sesi Harian");
    wsDaily.Cell(1, 1).Value = "LAPORAN TIMESHEET KERJA HARIAN";
    wsDaily.Cell(1, 1).Style.Font.Bold = true;
    wsDaily.Cell(1, 1).Style.Font.FontSize = 14;

    // Header tabel
    string[] headers = { "No", "Tanggal", "Tugas", "Proyek", "PIC", "Mulai", "Selesai", "Durasi (Jam)", "Catatan" };
    for (int i = 0; i < headers.Length; i++)
    {
        wsDaily.Cell(3, i + 1).Value = headers[i];
        wsDaily.Cell(3, i + 1).Style.Fill.BackgroundColor = XLColor.Indigo;
        wsDaily.Cell(3, i + 1).Style.Font.FontColor = XLColor.White;
        wsDaily.Cell(3, i + 1).Style.Font.Bold = true;
    }

    var sessions = await GetSessionsQuery(filter).ToListAsync();
    int row = 4;
    foreach (var s in sessions)
    {
        wsDaily.Cell(row, 1).Value = row - 3;
        wsDaily.Cell(row, 2).Value = s.StartTime.ToString("yyyy-MM-dd");
        wsDaily.Cell(row, 3).Value = s.Task.Title;
        wsDaily.Cell(row, 4).Value = s.Task.Project?.Name ?? "-";
        wsDaily.Cell(row, 5).Value = s.User.FullName;
        wsDaily.Cell(row, 6).Value = s.StartTime.ToString("HH:mm");
        wsDaily.Cell(row, 7).Value = s.EndTime?.ToString("HH:mm") ?? "Aktif";
        wsDaily.Cell(row, 8).Value = Math.Round(s.Duration / 3600.0, 2);
        wsDaily.Cell(row, 9).Value = s.Notes ?? "-";
        row++;
    }

    wsDaily.Columns().AdjustToContents();

    using var stream = new MemoryStream();
    workbook.SaveAs(stream);
    return stream.ToArray();
}
```

---

## 4. Implementasi Frontend Next.js (Berdasarkan `sample-web-ui`)

1. **Floating Multi-Timer Bar (Komponen Melayang Bawah / Topbar)**:
   - Komponen global `ActiveTimersWidget.tsx` yang memantau timer aktif via React Query interval (setiap 1 detik).
   - Menampilkan badge berjalan dengan efek pulse, tombol Stop, dan kalkulasi waktu berjalan (`01:24:35`).
2. **Halaman Log Timesheet (`/timesheets`)**:
   - Kartu metrik total jam hari ini, minggu ini, dan bulan ini.
   - Tombol "Ekspor Laporan Excel (.xlsx)" yang memicu download langsung stream file dari backend.
   - Form modal "Catat Jam Kerja Manual" menggunakan TailGrids `dialog.tsx` dengan pemilih waktu (`time-field.tsx` & `date-picker.tsx`).
