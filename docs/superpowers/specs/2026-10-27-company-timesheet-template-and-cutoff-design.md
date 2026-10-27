# Spesifikasi Desain: Modul Mapping Template Timesheet Perusahaan & Periode Cut-Off (Standar ELISTEC)

- **Tanggal:** 27 Oktober 2026
- **Status:** Approved by User / Ready for Implementation Plan
- **Target File:** `docs/superpowers/specs/2026-10-27-company-timesheet-template-and-cutoff-design.md`
- **Referensi Template:** `Timesheet Elistec - September 2026 - Syafix Said (2).xlsx`

---

## 1. Latar Belakang & Tujuan

TrackerKerja Modern saat ini memiliki fitur ekspor timesheet generik 3-sheet dan ekspor daftar tugas format ARMS. Namun, untuk memenuhi kebutuhan operasional resmi perusahaan rekanan (khususnya **ELISTEC**), diperlukan ekspor timesheet yang mengikuti format dokumen standar perusahaan dengan karakteristik:
1. **Header Dokumen Spesifik Perusahaan**: Memuat judul timesheet resmi, durasi hari kerja efektif, nama klien/mitra, nomor SOW/PO, dan nama personel.
2. **Format Tabel Standar ELISTEC**: Terdiri dari 14 kolom terstruktur (`Issue Key`, `Issue Summary`, `Hours`, `MD`, `Work Date`, `Clock In`, `Clock Out`, `Username`, `Full Name`, `Period`, `Project Name`, `Activity Type`, `Working Place`, `Evidence`).
3. **Baris Otomatis Hari Libur Akhir Pekan**: Sabtu dan Minggu otomatis disisipkan dengan durasi 0 jam dan status libur akhir pekan.
4. **Rumus & Rekapitulasi Dinamis**: Kolom Man-Days (MD) menggunakan formula Excel `=IF(C{row}="","",C{row}/8)`, baris Total dinamis `=SUM(...)`, serta blok tanda tangan resmi (`Resource` dan `Mengetahui`).
5. **Siklus Periode Cut-Off Bulanan**: Setiap perusahaan memiliki siklus cut-off tersendiri (contoh ELISTEC: tanggal 3 bulan berjalan s/d tanggal 2 bulan berikutnya). Diperlukan **Kalender Master Periode** agar admin dapat menentukan rentang cut-off setiap bulannya.
6. **Fleksibilitas Ekspor**:
   - Dapat diunduh per personel individual dalam format `.xlsx`.
   - Dapat diunduh secara massal (*bulk*) untuk seluruh personel dalam format arsip `.zip`.
7. **File Template-Based & Dynamic Column Mapping**: Mendukung pemakaian file `.xlsx` fisik kustom yang dapat diunggah per perusahaan atau menggunakan preset bawaan ELISTEC, disertai antarmuka pemetaan kolom dinamis di pengaturan master data.

---

## 2. Arsitektur Subsistem & Model Data

### 2.1. Entitas Database

#### A. `TimesheetPeriod` (Master Periode Cut-Off)
Menyimpan daftar periode cut-off bulanan per perusahaan:
```csharp
namespace TrackerKerja.Domain.Entities;

public class TimesheetPeriod
{
    public int Id { get; set; }
    public int CompanyId { get; set; }
    public string PeriodCode { get; set; } = string.Empty; // Contoh: "09/26"
    public string Name { get; set; } = string.Empty;       // Contoh: "September 2026"
    public DateOnly StartDate { get; set; }                // Contoh: 2026-09-03
    public DateOnly EndDate { get; set; }                  // Contoh: 2026-10-02
    public int WorkingDaysCount { get; set; }              // Contoh: 21 (Hari kerja efektif)
    public bool IsClosed { get; set; } = false;            // Status periode
    public string? Notes { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Company Company { get; set; } = null!;
}
```

#### B. `CompanyTimesheetConfig` (Konfigurasi Template & Dynamic Column Mapping)
Menyimpan referensi file fisik template, metadata header, dan aturan mapping:
```csharp
namespace TrackerKerja.Domain.Entities;

public class CompanyTimesheetConfig
{
    public int Id { get; set; }
    public int CompanyId { get; set; }
    
    // File template .xlsx fisik yang diunggah (jika null, gunakan template default ELISTEC)
    public string? TemplateFilePath { get; set; }
    
    // Metadata Header & Dokumen
    public string HeaderTitle { get; set; } = "ELISTEC - Timesheet"; // Cell E2
    public string ClientName { get; set; } = "Tugu Insurance";       // Cell G4
    public string? SowNumber { get; set; }                          // Cell L5
    public string ApproverTitle { get; set; } = "Mengetahui,";       // Cell G142
    public string ApproverName { get; set; } = "xxxx";              // Cell G149
    public string ResourceTitle { get; set; } = "Resource,";        // Cell B142

    // Pengaturan Akhir Pekan
    public bool IncludeWeekends { get; set; } = true;
    public string WeekendTaskTextFormat { get; set; } = "Hari Libur Akhir Pekan ({DayName}) - Tidak Ada Pengerjaan Task";

    // Konfigurasi Baris Template
    public int HeaderRowIndex { get; set; } = 7;
    public int DataStartRowIndex { get; set; } = 8;

    // Pemetaan Kolom Dinamis (Serialized JSON array of TimesheetColumnMappingDto)
    public string ColumnsMappingJson { get; set; } = string.Empty;

    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public Company Company { get; set; } = null!;
}
```

#### C. Skema JSON `TimesheetColumnMappingDto`
Setiap elemen array mendefinisikan kolom pada file Excel:
```json
[
  { "columnLetter": "A", "headerTitle": "Issue Key", "sourceField": "TaskKey", "formula": null, "defaultValue": "" },
  { "columnLetter": "B", "headerTitle": "Issue Summary", "sourceField": "TaskSummary", "formula": null, "defaultValue": "" },
  { "columnLetter": "C", "headerTitle": "Hours", "sourceField": "Hours", "formula": null, "defaultValue": "0" },
  { "columnLetter": "D", "headerTitle": "MD", "sourceField": "ManDaysFormula", "formula": "=IF(C{row}=\"\",\"\",C{row}/8)", "defaultValue": "" },
  { "columnLetter": "E", "headerTitle": "Work Date", "sourceField": "WorkDate", "formula": null, "defaultValue": "" },
  { "columnLetter": "F", "headerTitle": "Clock In", "sourceField": "ClockIn", "formula": null, "defaultValue": "-" },
  { "columnLetter": "G", "headerTitle": "Clock Out", "sourceField": "ClockOut", "formula": null, "defaultValue": "-" },
  { "columnLetter": "H", "headerTitle": "Username", "sourceField": "Username", "formula": null, "defaultValue": "" },
  { "columnLetter": "I", "headerTitle": "Full Name", "sourceField": "FullName", "formula": null, "defaultValue": "" },
  { "columnLetter": "J", "headerTitle": "Period", "sourceField": "PeriodCode", "formula": null, "defaultValue": "" },
  { "columnLetter": "K", "headerTitle": "Project Name", "sourceField": "ProjectName", "formula": null, "defaultValue": "-" },
  { "columnLetter": "L", "headerTitle": "Activity Type", "sourceField": "ActivityType", "formula": null, "defaultValue": "-" },
  { "columnLetter": "M", "headerTitle": "Working Place", "sourceField": "WorkingPlace", "formula": null, "defaultValue": "WFO" },
  { "columnLetter": "N", "headerTitle": "Evidence", "sourceField": "Evidence", "formula": null, "defaultValue": "" }
]
```

---

## 3. Engine Ekspor Berbasis Template ClosedXML

### 3.1. Template Fisik Bawaan (Default Embedded)
File template acuan `Timesheet Elistec - September 2026 - Syafix Said (2).xlsx` disiapkan sebagai template default di server pada direktori `uploads/templates/timesheet_elistec_default.xlsx`.

### 3.2. Tahapan Eksekusi Ekspor
1. **Load Template**: Memuat berkas `.xlsx` fisik melalui `XLWorkbook(filePath)`.
2. **Isi Metadata Header**:
   - Cell `E2`: `config.HeaderTitle`
   - Cell `B4`: `${period.WorkingDaysCount} DAYS`
   - Cell `G4`: `config.ClientName`
   - Cell `B5`: `user.FullName`
   - Cell `L5`: `config.SowNumber ?? ""`
3. **Agregasi Data**:
   - Query seluruh `WorkSession` pengguna pada rentang `period.StartDate` s/d `period.EndDate`.
   - Query seluruh `Attendance` pengguna pada rentang tersebut untuk mengambil nilai `ClockIn`, `ClockOut`, dan `WorkLocation`.
   - Untuk tanggal kerja tanpa sesi: dapat dilewati atau dimasukkan jika ada status cuti/izin.
   - Untuk tanggal akhir pekan (Sabtu & Minggu): jika `IncludeWeekends == true`, buat baris khusus akhir pekan.
4. **Injeksi Baris & Pewarisan Gaya**:
   - Baris data pertama dimulai pada baris ke-8.
   - ClosedXML menyisipkan baris tambahan di bawah baris ke-8 sesuai jumlah total item data.
   - Format sel (border tipis sekeliling sel, font Calibri 10pt, warna teks, dan number formatting) direplikasi dari baris acuan.
   - Formula kolom MD dievaluasi dinamis untuk baris bersangkutan: `=IF(C{row}="","",C{row}/8)`.
5. **Baris Total & Blok Tanda Tangan**:
   - Letakkan baris Total tepat di `lastDataRow + 1`:
     - Kolom B: `"Total "`
     - Kolom C: `=SUM(C8:C{lastDataRow})`
     - Kolom D: `=SUM(D8:D{lastDataRow})`
   - Geser dan posisikan blok tanda tangan di bawah Total:
     - Baris `lastDataRow + 4`: B: `config.ResourceTitle` ("Resource,"), G: `config.ApproverTitle` ("Mengetahui,")
     - Baris `lastDataRow + 11`: G: `config.ApproverName` ("xxxx")
     - Baris `lastDataRow + 13`: B: `user.FullName`

### 3.3. Bulk Export ZIP
- Mengiterasi seluruh pengguna di perusahaan yang bersangkutan.
- Membuat berkas `.xlsx` per pengguna secara *in-memory* menggunakan `MemoryStream`.
- Mengemas setiap file ke dalam `ZipArchive` dengan penamaan file:
  `Timesheet {CompanyCode} - {PeriodName} - {UserFullName}.xlsx`.
- Mengembalikan berkas kompresi dengan MIME `application/zip`.

---

## 4. Rincian API Endpoints

### 4.1. Kalender Periode Cut-Off (`/api/companies/{companyId}/timesheet-periods`)
- `GET /api/companies/{companyId}/timesheet-periods`
  - Response: `List<TimesheetPeriodDto>`
- `POST /api/companies/{companyId}/timesheet-periods`
  - Body: `{ periodCode, name, startDate, endDate, workingDaysCount, notes }`
- `PUT /api/companies/{companyId}/timesheet-periods/{periodId}`
  - Body: `{ periodCode, name, startDate, endDate, workingDaysCount, isClosed, notes }`
- `DELETE /api/companies/{companyId}/timesheet-periods/{periodId}`

### 4.2. Konfigurasi Template & Mapping (`/api/companies/{companyId}/timesheet-config`)
- `GET /api/companies/{companyId}/timesheet-config`
  - Response: `CompanyTimesheetConfigDto`
- `PUT /api/companies/{companyId}/timesheet-config`
  - Body: Update metadata dokumen & `columnsMapping`
- `POST /api/companies/{companyId}/timesheet-config/upload-template`
  - Form-Data: `file` (.xlsx)
- `POST /api/companies/{companyId}/timesheet-config/reset-default`
  - Mengembalikan ke template default ELISTEC

### 4.3. Ekspor Timesheet Resmi (`/api/timesheets/export/company-template`)
- `GET /api/timesheets/export/company-template?periodId={id}&userId={userId}&companyId={companyId}`
  - Jika `userId` diisi: mengembalikan file `.xlsx` untuk pengguna tersebut.
  - Jika `userId` kosong / `"all"`: mengembalikan file `.zip` berisi file `.xlsx` seluruh pengguna di perusahaan.

---

## 5. Rencana Antarmuka Pengguna (Frontend)

1. **Menu Konfigurasi (`/configuration`)**:
   - Subtab baru pada Master Data: **"Template & Periode Timesheet"**.
   - **Panel 1: Kalender Master Periode**: Manajemen tabel periode bulanan (tambah, edit, tutup periode, hapus).
   - **Panel 2: Konfigurasi Template & Mapping Kolom**: Form metadata (Client Name, SOW, Approver, Weekend toggle), upload file .xlsx template, dan tabel editor dynamic column mapping (reorder, add column, remove column).
2. **Menu Timesheets (`/timesheets`)**:
   - Tombol dropdown / modal **"Ekspor Standar Perusahaan (ELISTEC)"**.
   - Pilihan Perusahaan, Periode Cut-Off, dan Pilihan Pengguna (Individual atau Seluruh Anggota Tim).
   - Tombol download `.xlsx` (individual) atau download `.zip` (bulk).

---

## 6. Rencana Pengujian (Testing Strategy)
1. **Unit Test Engine**:
   - `CompanyTimesheetExportServiceTests`: memverifikasi pembuatan file `.xlsx` dari template fisik, memastikan metadata terisi, baris weekend terbuat otomatis, formula MD & SUM valid, dan struktur blok tanda tangan terbentuk rapi.
   - `BulkZipExportTests`: memverifikasi paket ZIP berisi file terpisah untuk setiap pengguna tanpa korupsi berkas.
2. **Controller Integration Tests**:
   - CRUD periode cut-off.
   - Upload berkas template `.xlsx`.
   - Autentikasi dan otorisasi ekspor (RBAC: user biasa hanya bisa unduh miliknya sendiri, admin bisa unduh semua/ZIP).
